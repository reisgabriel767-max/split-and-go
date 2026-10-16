import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "../src/app/api/groups/route";
import { createGroupUseCases } from "../src/application/groups";
import { SqlGroupRepository } from "../src/infrastructure/sql-group-repository";
import { database, type Database } from "../src/infrastructure/database";
import { deleteGroup } from "../src/presentation/groups-client";
import { withoutGroup } from "../src/presentation/group-state";
import DeleteGroupConfirmation from "../src/components/delete-group-confirmation";
import type { GroupData } from "../src/lib/types";
import { useTestDatabase } from "./database-setup";

useTestDatabase("deletion");

function request(
  method: string,
  body: unknown,
  origin = "http://localhost:3000",
) {
  return new NextRequest("http://localhost:3000/api/groups", {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
async function post(body: unknown) {
  const response = await POST(request("POST", body));
  assert.equal(response.status, 201);
  return (await response.json()).id as string;
}
async function load(): Promise<GroupData> {
  return (await GET()).json();
}
async function createPopulatedGroup(name: string) {
  const id = await post({
    action: "group",
    name,
    currency: "BRL",
    category: "event",
    members: ["Ana", "Bia"],
  });
  const members = (await load()).members.filter((m) => m.group_id === id);
  await post({
    action: "expense",
    groupId: id,
    payerId: members[0].id,
    description: "Jantar",
    amount: 1001,
    spentOn: "2026-10-16",
    memberIds: members.map((m) => m.id),
  });
  return id;
}

test("DELETE removes only the selected group and all related rows, including repeated requests", async () => {
  const id = await createPopulatedGroup("Excluir");
  const other = await createPopulatedGroup("Preservar");
  const before = await load();
  const removedExpenses = new Set(
    before.expenses.filter((e) => e.group_id === id).map((e) => e.id),
  );
  assert.ok(before.shares.some((s) => removedExpenses.has(s.expense_id)));
  const response = await DELETE(request("DELETE", { groupId: id }));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  const after = await load();
  assert.deepEqual(after, withoutGroup(before, id));
  assert.ok(after.groups.some((g) => g.id === other));
  assert.ok(after.expenses.some((e) => e.group_id === other));
  assert.ok(!after.shares.some((s) => removedExpenses.has(s.expense_id)));
  assert.equal((await DELETE(request("DELETE", { groupId: id }))).status, 204);
  assert.deepEqual(await load(), after);
});

test("DELETE validates the exact UUID payload and rejects foreign Origin without deleting data", async () => {
  const id = await createPopulatedGroup("Validacao");
  const before = await load();
  for (const value of [
    null,
    {},
    { groupId: "' OR 1=1 --" },
    { groupId: [id] },
    { groupId: id, all: true },
  ])
    assert.equal((await DELETE(request("DELETE", value))).status, 400);
  assert.equal(
    (await DELETE(request("DELETE", { groupId: id }, "https://other.example")))
      .status,
    403,
  );
  const malformed = new NextRequest("http://localhost:3000/api/groups", {
    method: "DELETE",
    body: "{",
  });
  assert.equal((await DELETE(malformed)).status, 400);
  assert.deepEqual(await load(), before);
});

test("DELETE handles empty and nonexistent groups without affecting others", async () => {
  const id = await post({
    action: "group",
    name: "Sem despesas",
    currency: "EUR",
    category: "home",
    members: ["Carla"],
  });
  const before = await load();
  assert.equal((await DELETE(request("DELETE", { groupId: id }))).status, 204);
  const after = await load();
  assert.deepEqual(after, withoutGroup(before, id));
  assert.equal(
    (await DELETE(request("DELETE", { groupId: randomUUID() }))).status,
    204,
  );
  assert.deepEqual(await load(), after);
});

test("a failure after DELETE rolls back group, members, expenses and shares", async () => {
  const id = await createPopulatedGroup("Rollback exclusao");
  const db = await database();
  const before = await load();
  let deleted = false;
  const faulty: Database = {
    ...db,
    transaction: (operation) =>
      db.transaction((tx) =>
        operation({
          ...tx,
          async query<T>(sql: string, values?: unknown[]) {
            const result = await tx.query<T>(sql, values);
            if (sql.startsWith("DELETE FROM groups")) {
              deleted = true;
              throw new Error("Injected failure after deletion");
            }
            return result;
          },
        }),
      ),
  };
  const service = createGroupUseCases(
    new SqlGroupRepository(async () => faulty),
    randomUUID,
  );
  await assert.rejects(service.deleteGroup(id), /Injected failure/);
  assert.equal(deleted, true);
  assert.deepEqual(await load(), before);
});

test("deletion client sends the selected ID, accepts empty 204 and preserves error feedback", async () => {
  const id = randomUUID();
  let called = false;
  await deleteGroup(id, async (url, init) => {
    called = true;
    assert.equal(url, "/api/groups");
    assert.equal(init?.method, "DELETE");
    assert.deepEqual(JSON.parse(String(init?.body)), { groupId: id });
    assert.deepEqual(init?.headers, { "Content-Type": "application/json" });
    return new Response(null, { status: 204 });
  });
  assert.equal(called, true);
  await assert.rejects(
    deleteGroup(id, async () =>
      Response.json({ error: "Falha ao excluir" }, { status: 503 }),
    ),
    /Falha ao excluir/,
  );
  await assert.rejects(
    deleteGroup(id, async () => new Response("Unavailable", { status: 502 })),
    /Nao foi possivel excluir/,
  );
  await assert.rejects(
    deleteGroup(id, async () => {
      throw new Error("Network unavailable");
    }),
    /Network unavailable/,
  );
});

test("local snapshot removes the last group without mutating the loaded state", async () => {
  const id = await createPopulatedGroup("Ultimo grupo local");
  const snapshot = await load();
  const expenses = snapshot.expenses.filter((e) => e.group_id === id);
  const ids = new Set(expenses.map((e) => e.id));
  const isolated: GroupData = {
    groups: snapshot.groups.filter((g) => g.id === id),
    members: snapshot.members.filter((m) => m.group_id === id),
    expenses,
    shares: snapshot.shares.filter((s) => ids.has(s.expense_id)),
  };
  const copy = structuredClone(isolated);
  assert.deepEqual(withoutGroup(isolated, id), {
    groups: [],
    members: [],
    expenses: [],
    shares: [],
  });
  assert.deepEqual(isolated, copy);
});

test("confirmation names the target, warns about every cascade and escapes user names", () => {
  const html = renderToStaticMarkup(
    createElement(DeleteGroupConfirmation, {
      group: { name: 'Viagem <script>alert("x")</script>' },
      value: "",
      onChange() {},
    }),
  );
  assert.match(html, /participantes, despesas e rateios/);
  assert.match(html, /nao pode ser desfeita/);
  assert.match(html, /aria-describedby="delete-group-warning"/);
  assert.match(html, /name="confirmation"/);
  assert.match(html, /required=""/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
