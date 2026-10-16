import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createGroupUseCases } from "../src/application/groups";
import { ApplicationError } from "../src/application/errors";
import { SqlGroupRepository } from "../src/infrastructure/sql-group-repository";
import { database, type Database } from "../src/infrastructure/database";
import { useTestDatabase } from "./database-setup";

useTestDatabase("repository");

test("SQL repository rolls back expense and every share if a later share insert fails", async () => {
  const db = await database();
  const repository = new SqlGroupRepository(async () => db);
  const service = createGroupUseCases(repository, randomUUID);
  const groupId = await service.createGroup({
    name: "Rollback",
    currency: "BRL",
    category: "trip",
    members: ["Ana", "Bruno"],
  });
  const before = await repository.getSnapshot();
  const members = before.members.filter((m) => m.group_id === groupId);
  let inserted = 0;
  const faulty: Database = {
    ...db,
    transaction: (callback) =>
      db.transaction((tx) =>
        callback({
          ...tx,
          async query<T>(sql: string, values?: unknown[]) {
            if (
              sql.startsWith("INSERT INTO expense_shares") &&
              ++inserted === 2
            )
              throw new Error("Injected storage failure");
            return tx.query<T>(sql, values);
          },
        }),
      ),
  };
  const failing = createGroupUseCases(
    new SqlGroupRepository(async () => faulty),
    randomUUID,
  );
  await assert.rejects(
    failing.createExpense({
      groupId,
      payerId: members[0].id,
      description: "Nao gravar",
      amount: 1001,
      spentOn: "2026-10-16",
      memberIds: members.map((m) => m.id),
      split: { mode: "equal" },
    }),
    /Injected storage failure/,
  );
  assert.equal(
    inserted,
    2,
    "failure happens after the first part was inserted",
  );
  const after = await repository.getSnapshot();
  assert.deepEqual(after.expenses, before.expenses);
  assert.deepEqual(after.shares, before.shares);
});

test("SQL duplicate-name errors become application errors after rollback", async () => {
  const repository = new SqlGroupRepository(database);
  const service = createGroupUseCases(repository, randomUUID);
  const id = await service.createGroup({
    name: "Unicidade",
    currency: "EUR",
    category: "home",
    members: ["Ana"],
  });
  await assert.rejects(
    service.addGroupMember({ groupId: id, name: "ana" }),
    (e: unknown) =>
      e instanceof ApplicationError && e.code === "DUPLICATE_MEMBER",
  );
  assert.equal(
    (await service.getGroupsSnapshot()).members.filter((m) => m.group_id === id)
      .length,
    1,
  );
});
