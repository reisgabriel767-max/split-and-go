import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { database } from "../src/lib/db";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/groups/route";
import type { GroupData } from "../src/lib/types";
import { calculateBalances, planSettlement } from "../src/lib/settlement";

import { useTestDatabase } from "./database-setup";
useTestDatabase("api");

test("groups accept twenty members and reject creation or growth beyond that limit", async () => {
  const value = {
    action: "group",
    name: "Limite",
    currency: "BRL",
    category: "trip",
    members: Array.from({ length: 21 }, (_, i) => `Pessoa ${i + 1}`),
  };
  assert.equal((await POST(request(value))).status, 400);
  const created = await POST(
    request({ ...value, members: value.members.slice(0, 19) }),
  );
  assert.equal(created.status, 201);
  const { id: groupId } = await created.json();
  const attempts = await Promise.all([
    POST(request({ action: "member", groupId, name: "Pessoa 20 A" })),
    POST(request({ action: "member", groupId, name: "Pessoa 20 B" })),
  ]);
  assert.deepEqual(
    attempts.map((response) => response.status).sort(),
    [201, 400],
  );
  const rejected = await POST(
    request({ action: "member", groupId, name: "Pessoa 21" }),
  );
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error, /20 participantes/);
  const data: GroupData = await (await GET()).json();
  assert.equal(data.members.filter((m) => m.group_id === groupId).length, 20);
  assert.equal(data.groups.filter((g) => g.name === "Limite").length, 1);
});

test("legacy groups above twenty members retain their data and expense support without growing", async () => {
  const created = await POST(
    request({
      action: "group",
      name: "Legado",
      currency: "BRL",
      category: "home",
      members: Array.from({ length: 20 }, (_, i) => `Legado ${i + 1}`),
    }),
  );
  assert.equal(created.status, 201);
  const { id: groupId } = await created.json();
  const db = await database();
  await db.query("INSERT INTO members (id, group_id, name) VALUES ($1,$2,$3)", [
    randomUUID(),
    groupId,
    "Legado 21",
  ]);
  let data: GroupData = await (await GET()).json();
  const members = data.members.filter((m) => m.group_id === groupId);
  assert.equal(members.length, 21);
  assert.equal(
    (await POST(request({ action: "member", groupId, name: "Legado 22" })))
      .status,
    400,
  );
  const saved = await POST(
    request({
      action: "expense",
      groupId,
      payerId: members[0].id,
      description: "Historico preservado",
      amount: 2100,
      spentOn: "2026-10-14",
      memberIds: members.map((m) => m.id),
    }),
  );
  assert.equal(saved.status, 201);
  const { id: expenseId } = await saved.json();
  data = await (await GET()).json();
  assert.equal(data.members.filter((m) => m.group_id === groupId).length, 21);
  assert.equal(
    data.shares.filter((s) => s.expense_id === expenseId).length,
    21,
  );
  assert.equal(
    data.shares
      .filter((s) => s.expense_id === expenseId)
      .reduce((sum, s) => sum + s.amount, 0),
    2100,
  );
});

function request(value: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(value),
  });
}

test("group-to-expense flow persists exact shares, enforces membership and rejects invalid inputs", async () => {
  const created = await POST(
    request({
      action: "group",
      name: "Teste",
      currency: "BRL",
      category: "trip",
      members: ["Ana", "Bruno", "Carla"],
    }),
  );
  assert.equal(created.status, 201);
  const { id: groupId } = await created.json();
  let state = await (await GET()).json();
  const members = state.members.filter(
    (m: { group_id: string }) => m.group_id === groupId,
  );
  assert.equal(members.length, 3);
  const value = {
    action: "expense",
    groupId,
    payerId: members[0].id,
    description: "Jantar",
    amount: 1000,
    spentOn: "2026-10-13",
    memberIds: members.map((m: { id: string }) => m.id),
  };
  const expense = await POST(request(value));
  assert.equal(expense.status, 201);
  const { id: expenseId } = await expense.json();
  state = await (await GET()).json();
  const shares = state.shares.filter(
    (s: { expense_id: string }) => s.expense_id === expenseId,
  );
  assert.deepEqual(
    shares.map((s: { amount: number }) => s.amount).sort(),
    [333, 333, 334],
  );
  assert.equal(
    state.expenses.find((e: { id: string }) => e.id === expenseId).spent_on,
    "2026-10-13",
  );
  assert.equal(
    (await POST(request({ action: "member", groupId, name: "ana" }))).status,
    409,
  );
  assert.equal(
    (
      await POST(
        request({ ...value, memberIds: [members[0].id, members[0].id] }),
      )
    ).status,
    400,
  );
  assert.equal((await POST(request({ ...value, amount: -1 }))).status, 400);
  assert.equal(
    (await POST(request({ ...value, spentOn: "2026-02-30" }))).status,
    400,
  );
  assert.equal(
    (await POST(request(value, "https://another-site.example"))).status,
    403,
  );
  assert.equal((await POST(request(value, "invalid-origin"))).status, 403);
  assert.equal(
    (
      await POST(
        request({
          action: "group",
          name: "  ",
          currency: "BRL",
          category: "trip",
          members: ["Ana"],
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await POST(
        request({
          action: "group",
          name: "Grupo",
          currency: "BRL",
          category: "trip",
          members: ["Ana", "ana"],
        }),
      )
    ).status,
    400,
  );
  const other = await POST(
    request({
      action: "group",
      name: "Outro",
      currency: "EUR",
      category: "home",
      members: ["Dora"],
    }),
  );
  const { id: otherId } = await other.json();
  const foreign = (await (await GET()).json()).members.find(
    (m: { group_id: string }) => m.group_id === otherId,
  );
  assert.equal(
    (await POST(request({ ...value, payerId: foreign.id }))).status,
    400,
  );
  assert.equal(
    (await POST(request({ ...value, memberIds: [foreign.id] }))).status,
    400,
  );
  state = await (await GET()).json();
  assert.equal(
    state.expenses.filter((e: { group_id: string }) => e.group_id === groupId)
      .length,
    1,
  );
  assert.equal(
    (await POST(request({ action: "member", groupId, name: "Eva" }))).status,
    201,
  );
  state = await (await GET()).json();
  assert.equal(
    state.shares.filter(
      (s: { expense_id: string }) => s.expense_id === expenseId,
    ).length,
    3,
    "new members must not change historical expense shares",
  );
});

test("custom split requests validate totals and membership and persist the chosen mode and percentages", async () => {
  const group = await POST(
    request({
      action: "group",
      name: "Rateios",
      currency: "BRL",
      category: "event",
      members: ["Alice", "Bob", "Carol"],
    }),
  );
  const { id: groupId } = await group.json();
  const state: GroupData = await (await GET()).json();
  const members = state.members.filter((m) => m.group_id === groupId);
  const ids = members.map((m) => m.id).sort();
  const expense = {
    action: "expense",
    groupId,
    payerId: ids[0],
    description: "Percentual",
    amount: 1001,
    spentOn: "2026-10-14",
    memberIds: ids,
  };
  const allocations = ids.map((memberId, index) => ({
    memberId,
    value: [5000, 3000, 2000][index],
  }));
  const percentage = await POST(
    request({ ...expense, split: { mode: "percentage", allocations } }),
  );
  assert.equal(percentage.status, 201);
  const { id: percentageId } = await percentage.json();
  const fixedParts = ids.map((memberId, index) => ({
    memberId,
    value: [700, 301, 0][index],
  }));
  const fixed = await POST(
    request({
      ...expense,
      description: "Fixo",
      split: { mode: "fixed", allocations: fixedParts },
    }),
  );
  assert.equal(fixed.status, 201);
  const { id: fixedId } = await fixed.json();

  for (const split of [
    {
      mode: "percentage",
      allocations: allocations.map((a) => ({ ...a, value: 1000 })),
    },
    {
      mode: "percentage",
      allocations: [allocations[0], allocations[0], allocations[2]],
    },
    { mode: "percentage", allocations: allocations.slice(1) },
    {
      mode: "percentage",
      allocations: [
        { memberId: ids[0], value: 10001 },
        { memberId: ids[1], value: -1 },
        { memberId: ids[2], value: 0 },
      ],
    },
    {
      mode: "percentage",
      allocations: [
        { memberId: ids[0], value: 5000.5 },
        { memberId: ids[1], value: 2999.5 },
        { memberId: ids[2], value: 2000 },
      ],
    },
    { mode: "fixed", allocations: fixedParts.map((a) => ({ ...a, value: 1 })) },
    {
      mode: "fixed",
      allocations: [
        ...fixedParts.slice(0, 2),
        { memberId: "11111111-1111-4111-8111-111111111111", value: 0 },
      ],
    },
  ])
    assert.equal((await POST(request({ ...expense, split }))).status, 400);
  const saved: GroupData = await (await GET()).json();
  assert.equal(
    saved.expenses.filter((e) => e.group_id === groupId).length,
    2,
    "invalid requests must not create expense rows",
  );
  assert.equal(
    saved.expenses.find((e) => e.id === percentageId)?.split_mode,
    "percentage",
  );
  assert.equal(
    saved.expenses.find((e) => e.id === fixedId)?.split_mode,
    "fixed",
  );
  for (const [id, values] of [
    [percentageId, [501, 300, 200]],
    [fixedId, [700, 301, 0]],
  ] as [string, number[]][]) {
    const parts = saved.shares
      .filter((s) => s.expense_id === id)
      .sort((a, b) => a.member_id.localeCompare(b.member_id));
    assert.deepEqual(
      parts.map((p) => p.amount),
      values,
    );
    assert.equal(
      parts.reduce((sum, p) => sum + p.amount, 0),
      1001,
    );
    assert.deepEqual(
      parts.map((p) => p.percentage),
      id === percentageId ? [5000, 3000, 2000] : [null, null, null],
    );
  }
});

test("foreign expenses split the converted amount and retain their original historical rates", async () => {
  const created = await POST(
    request({
      action: "group",
      name: "Cambio",
      currency: "BRL",
      category: "trip",
      members: ["Ana", "Bruno", "Carla"],
    }),
  );
  const { id: groupId } = await created.json();
  const initial: GroupData = await (await GET()).json();
  const members = initial.members.filter((m) => m.group_id === groupId);
  const ids = members.map((m) => m.id).sort();
  const value = {
    action: "expense",
    groupId,
    payerId: ids[2],
    description: "Cambio fixo",
    amount: 1001,
    currency: "USD",
    exchangeRate: "5,25",
    spentOn: "2026-10-14",
    memberIds: ids.slice(0, 2),
    split: {
      mode: "fixed",
      allocations: [
        { memberId: ids[0], value: 3000 },
        { memberId: ids[1], value: 2255 },
      ],
    },
  };
  const first = await POST(request(value));
  assert.equal(first.status, 201);
  const { id: firstId } = await first.json();
  const second = await POST(
    request({
      ...value,
      description: "Outra cotacao",
      exchangeRate: "6",
      split: {
        mode: "percentage",
        allocations: [
          { memberId: ids[0], value: 6000 },
          { memberId: ids[1], value: 4000 },
        ],
      },
    }),
  );
  assert.equal(second.status, 201);
  const { id: secondId } = await second.json();
  for (const change of [
    { exchangeRate: undefined },
    { exchangeRate: "0" },
    { exchangeRate: "-1" },
    { exchangeRate: "1e2" },
    { exchangeRate: "1.0000001" },
    { currency: "BRL", exchangeRate: "2" },
    { currency: "JPY" },
    { amount: 1, exchangeRate: "0.001" },
    {
      split: {
        mode: "fixed",
        allocations: [
          { memberId: ids[0], value: 500 },
          { memberId: ids[1], value: 501 },
        ],
      },
    },
  ])
    assert.equal((await POST(request({ ...value, ...change }))).status, 400);
  const saved: GroupData = await (await GET()).json();
  const expenses = saved.expenses.filter((e) => e.group_id === groupId);
  assert.equal(expenses.length, 2);
  const original = expenses.find((e) => e.id === firstId)!;
  assert.equal(original.amount, 5255);
  assert.equal(original.original_amount, 1001);
  assert.equal(original.original_currency, "USD");
  assert.equal(Number(original.exchange_rate), 5.25);
  assert.equal(expenses.find((e) => e.id === secondId)!.amount, 6006);
  assert.deepEqual(
    saved.shares
      .filter((s) => s.expense_id === secondId)
      .sort((a, b) => a.member_id.localeCompare(b.member_id))
      .map((s) => s.amount),
    [3604, 2402],
  );
  const balances = calculateBalances(members, expenses, saved.shares);
  assert.equal(
    balances.reduce((sum, m) => sum + m.balance, 0),
    0,
  );
  const plan = planSettlement(balances);
  assert.equal(plan.optimal, true);
  assert.equal(plan.transfers.length, 2);
  assert.equal(
    plan.transfers.reduce((sum, t) => sum + t.amount, 0),
    11261,
  );
});
