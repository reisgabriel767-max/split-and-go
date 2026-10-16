import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGroupUseCases,
  type CreateExpenseInput,
} from "../src/application/groups";
import { ApplicationError } from "../src/application/errors";
import type {
  ExpenseRecord,
  GroupRepository,
  GroupTransaction,
} from "../src/application/group-repository";
import type { GroupData, SplitShare } from "../src/lib/types";

function fixture(overrides: Partial<GroupTransaction> = {}) {
  const calls: string[] = [];
  const saved: { expense?: ExpenseRecord; shares?: SplitShare[] } = {};
  const snapshot: GroupData = {
    groups: [],
    members: [],
    expenses: [],
    shares: [],
  };
  const tx: GroupTransaction = {
    async insertGroup() {
      calls.push("group");
    },
    async insertMember() {
      calls.push("member");
    },
    async lockGroup(id) {
      calls.push("lock");
      return { id, currency: "BRL" };
    },
    async countMembers() {
      calls.push("count");
      return 2;
    },
    async memberIds() {
      return ["ana", "bruno"];
    },
    async insertExpense(expense, shares) {
      calls.push("expense");
      Object.assign(saved, { expense, shares });
    },
    ...overrides,
  };
  const repository: GroupRepository = {
    async transaction(operation) {
      calls.push("begin");
      try {
        const value = await operation(tx);
        calls.push("commit");
        return value;
      } catch (error) {
        calls.push("rollback");
        throw error;
      }
    },
    async getSnapshot() {
      return snapshot;
    },
  };
  let id = 0;
  return {
    service: createGroupUseCases(repository, () => `id-${++id}`),
    calls,
    saved,
    snapshot,
  };
}
const expense: CreateExpenseInput = {
  groupId: "group",
  payerId: "ana",
  description: "Reserva",
  amount: 1001,
  spentOn: "2026-10-16",
  memberIds: ["bruno"],
  split: { mode: "equal" },
  currency: "USD",
  exchangeRate: "5.25",
};

test("application creates group and members in one transaction without HTTP or SQL", async () => {
  const { service, calls, snapshot } = fixture();
  assert.equal(
    await service.createGroup({
      name: "Casa",
      currency: "BRL",
      category: "home",
      members: ["Ana", "Bruno"],
    }),
    "id-1",
  );
  assert.deepEqual(calls, ["begin", "group", "member", "member", "commit"]);
  assert.equal(await service.getGroupsSnapshot(), snapshot);
  await assert.rejects(
    service.createGroup({
      name: "Casa",
      currency: "BRL",
      category: "home",
      members: Array.from({ length: 21 }, (_, i) => String(i)),
    }),
    (e: unknown) => e instanceof ApplicationError && e.code === "INVALID_INPUT",
  );
});

test("application locks before checking member capacity and reports typed errors", async () => {
  const normal = fixture();
  await normal.service.addGroupMember({ groupId: "group", name: "Carla" });
  assert.deepEqual(normal.calls, [
    "begin",
    "lock",
    "count",
    "member",
    "commit",
  ]);
  const full = fixture({
    async countMembers() {
      return 20;
    },
  });
  await assert.rejects(
    full.service.addGroupMember({ groupId: "group", name: "Carla" }),
    (e: unknown) => e instanceof ApplicationError && e.code === "MEMBER_LIMIT",
  );
  assert.equal(full.calls.includes("member"), false);
  assert.equal(full.calls.at(-1), "rollback");
  const missing = fixture({
    async lockGroup() {
      return undefined;
    },
  });
  await assert.rejects(
    missing.service.addGroupMember({ groupId: "missing", name: "Carla" }),
    (e: unknown) =>
      e instanceof ApplicationError && e.code === "GROUP_NOT_FOUND",
  );
});

test("application converts before splitting and preserves foreign history and excluded payer", async () => {
  const { service, saved } = fixture();
  await service.createExpense(expense);
  assert.equal(saved.expense?.amount, 5255);
  assert.equal(saved.expense?.originalAmount, 1001);
  assert.equal(saved.expense?.originalCurrency, "USD");
  assert.equal(saved.expense?.exchangeRate, "5.25");
  assert.deepEqual(saved.shares, [{ memberId: "bruno", amount: 5255 }]);
  await service.createExpense({
    ...expense,
    split: { mode: "fixed", allocations: [{ memberId: "bruno", value: 5255 }] },
  });
  assert.equal(saved.expense?.splitMode, "fixed");
});

test("application rejects foreign participants, invalid conversions and invalid parts before persistence", async () => {
  for (const input of [
    { ...expense, payerId: "outsider" },
    { ...expense, memberIds: ["outsider"] },
    { ...expense, exchangeRate: "0" },
    {
      ...expense,
      split: {
        mode: "fixed" as const,
        allocations: [{ memberId: "bruno", value: 1001 }],
      },
    },
  ]) {
    const { service, calls } = fixture();
    await assert.rejects(service.createExpense(input));
    assert.equal(calls.includes("expense"), false);
    assert.equal(calls.at(-1), "rollback");
  }
});
