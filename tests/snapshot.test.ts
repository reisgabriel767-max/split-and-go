import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/groups/route";
import { database, type Database } from "../src/lib/db";
import type { GroupData } from "../src/lib/types";
import { calculateBalances, planSettlement } from "../src/lib/settlement";
import { useTestDatabase } from "./database-setup";

useTestDatabase("snapshot");

function request(value: unknown) {
  return new NextRequest("http://localhost:3000/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

test("GET uses a read-only repeatable-read transaction", async () => {
  const db = await database();
  const state = globalThis as typeof globalThis & {
    splitgoDb?: Promise<Database>;
  };
  const original = state.splitgoDb;
  let checked = 0;
  state.splitgoDb = Promise.resolve({
    ...db,
    transaction: (callback) =>
      db.transaction((tx) =>
        callback({
          ...tx,
          async query<T>(sql: string, values?: unknown[]) {
            const [settings] = await tx.query<{
              isolation: string;
              readonly: string;
            }>(
              "SELECT current_setting('transaction_isolation') AS isolation, current_setting('transaction_read_only') AS readonly",
            );
            assert.equal(settings.isolation, "repeatable read");
            assert.equal(settings.readonly, "on");
            checked++;
            return tx.query<T>(sql, values);
          },
        }),
      ),
  });
  try {
    assert.equal((await GET()).status, 200);
    assert.equal(checked, 4);
  } finally {
    state.splitgoDb = original;
  }
});

test(
  "GET keeps members and expenses consistent when a writer commits between reads",
  { skip: !process.env.SPLITGO_TEST_DATABASE_URL },
  async () => {
    const db = await database();
    const created = await POST(
      request({
        action: "group",
        name: "Concurrent snapshot",
        currency: "BRL",
        category: "trip",
        members: ["Ana"],
      }),
    );
    assert.equal(created.status, 201);
    const { id: groupId } = await created.json();
    const initial: GroupData = await (await GET()).json();
    const ana = initial.members.find((m) => m.group_id === groupId)!;
    const state = globalThis as typeof globalThis & {
      splitgoDb?: Promise<Database>;
    };
    const original = state.splitgoDb;
    let committed = false;
    let expenseId = "";
    state.splitgoDb = Promise.resolve({
      ...db,
      transaction: (callback) =>
        db.transaction((tx) =>
          callback({
            ...tx,
            async query<T>(sql: string, values?: unknown[]) {
              const rows = await tx.query<T>(sql, values);
              if (
                !committed &&
                sql.startsWith("SELECT id, group_id, name FROM members")
              ) {
                committed = true;
                // The writer uses the original pool, not the reader's transaction.
                state.splitgoDb = original;
                const member = await POST(
                  request({ action: "member", groupId, name: "Bruno" }),
                );
                assert.equal(member.status, 201);
                const { id: bruno } = await member.json();
                const expense = await POST(
                  request({
                    action: "expense",
                    groupId,
                    payerId: bruno,
                    description: "Concurrent expense",
                    amount: 1000,
                    spentOn: "2026-10-14",
                    memberIds: [ana.id, bruno],
                  }),
                );
                assert.equal(expense.status, 201);
                expenseId = (await expense.json()).id;
              }
              return rows;
            },
          }),
        ),
    });
    try {
      const response = await GET();
      assert.equal(response.status, 200);
      const snapshot: GroupData = await response.json();
      assert.equal(committed, true);
      assert.equal(
        snapshot.members.filter((m) => m.group_id === groupId).length,
        1,
      );
      assert.equal(
        snapshot.expenses.some((e) => e.id === expenseId),
        false,
      );
      assert.equal(
        snapshot.shares.some((s) => s.expense_id === expenseId),
        false,
      );
      const after: GroupData = await (await GET()).json();
      assert.equal(
        after.members.filter((m) => m.group_id === groupId).length,
        2,
      );
      assert.equal(
        after.expenses.some((e) => e.id === expenseId),
        true,
      );
      const balances = calculateBalances(
        after.members.filter((m) => m.group_id === groupId),
        after.expenses.filter((e) => e.group_id === groupId),
        after.shares,
      );
      assert.equal(
        balances.reduce((sum, m) => sum + m.balance, 0),
        0,
      );
      assert.equal(planSettlement(balances).transfers.length, 1);
    } finally {
      state.splitgoDb = original;
    }
  },
);
