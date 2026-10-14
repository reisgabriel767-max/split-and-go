import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/groups/route";

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
