import { test } from "node:test";
import assert from "node:assert/strict";
import { database, migrate } from "../src/lib/db";

Object.assign(process.env, { NODE_ENV: "test" });
delete process.env.DATABASE_URL;

test("upgrading an existing initial schema preserves expense values and adds equal split defaults", async () => {
  const db = await database();
  // Recreate the previous schema state only inside this test process's in-memory database.
  await db.exec(
    "ALTER TABLE expenses DROP COLUMN split_mode; ALTER TABLE expenses DROP COLUMN original_amount; ALTER TABLE expenses DROP COLUMN original_currency; ALTER TABLE expenses DROP COLUMN exchange_rate; ALTER TABLE expense_shares DROP COLUMN percentage; DROP TABLE schema_migrations;",
  );
  const group = "11111111-1111-4111-8111-111111111111";
  const member = "22222222-2222-4222-8222-222222222222";
  const expense = "33333333-3333-4333-8333-333333333333";
  await db.query(
    "INSERT INTO groups (id,name,currency,category) VALUES ($1,'Legado','BRL','home')",
    [group],
  );
  await db.query(
    "INSERT INTO members (id,group_id,name) VALUES ($1,$2,'Ana')",
    [member, group],
  );
  await db.query(
    "INSERT INTO expenses (id,group_id,payer_id,description,amount,spent_on) VALUES ($1,$2,$3,'Anterior',1001,'2026-10-13')",
    [expense, group, member],
  );
  await db.query(
    "INSERT INTO expense_shares (expense_id,group_id,member_id,amount) VALUES ($1,$2,$3,1001)",
    [expense, group, member],
  );
  await migrate(db);
  await migrate(db);
  assert.deepEqual(
    await db.query("SELECT amount,split_mode FROM expenses WHERE id=$1", [
      expense,
    ]),
    [{ amount: 1001, split_mode: "equal" }],
  );
  assert.deepEqual(
    await db.query(
      "SELECT amount,percentage FROM expense_shares WHERE expense_id=$1",
      [expense],
    ),
    [{ amount: 1001, percentage: null }],
  );
  assert.deepEqual(
    await db.query(
      "SELECT original_amount,original_currency,exchange_rate::text FROM expenses WHERE id=$1",
      [expense],
    ),
    [
      {
        original_amount: 1001,
        original_currency: "BRL",
        exchange_rate: "1.000000",
      },
    ],
  );
  assert.equal(
    (await db.query("SELECT version FROM schema_migrations")).length,
    3,
  );
});
