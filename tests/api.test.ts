import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/groups/route";
import type { GroupData } from "../src/lib/types";

Object.assign(process.env, { NODE_ENV: "test" });
delete process.env.DATABASE_URL;

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
  assert.equal(state.expenses.length, 1);
  assert.equal(
    (await POST(request({ action: "member", groupId, name: "Eva" }))).status,
    201,
  );
  state = await (await GET()).json();
  assert.equal(
    state.shares.length,
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
