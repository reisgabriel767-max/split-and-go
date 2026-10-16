import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGroups, saveGroup } from "../src/presentation/groups-client";
import {
  groupErrorResponse,
  groupInput,
} from "../src/presentation/groups-http";
import { readSplitSpec } from "../src/presentation/expense-form";
import { ApplicationError } from "../src/application/errors";
import { CurrencyError } from "../src/lib/fx";
import { SplitError } from "../src/lib/money";

test("HTTP client preserves snapshot URL, no-store policy, JSON command and server errors", async () => {
  const snapshot = { groups: [], members: [], expenses: [], shares: [] };
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(
      init?.method === "POST" ? { id: "created" } : snapshot,
    );
  };
  assert.deepEqual(await loadGroups(fetcher), snapshot);
  assert.equal(calls[0].url, "/api/groups");
  assert.equal(calls[0].init?.cache, "no-store");
  const command = { action: "member" as const, groupId: "group", name: "Ana" };
  assert.deepEqual(await saveGroup(command, fetcher), { id: "created" });
  assert.equal(calls[1].init?.method, "POST");
  assert.equal(
    (calls[1].init?.headers as Record<string, string>)["Content-Type"],
    "application/json",
  );
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), command);
  const rejected: typeof fetch = async () =>
    Response.json({ error: "Servidor indisponivel" }, { status: 503 });
  await assert.rejects(loadGroups(rejected), /Servidor indisponivel/);
  await assert.rejects(saveGroup(command, rejected), /Servidor indisponivel/);
});

test("presentation converts form strings into exact units without React", () => {
  assert.deepEqual(readSplitSpec("equal", ["a"], {}), { mode: "equal" });
  assert.deepEqual(
    readSplitSpec("percentage", ["a", "b"], { a: "33,33", b: "66,67" }),
    {
      mode: "percentage",
      allocations: [
        { memberId: "a", value: 3333 },
        { memberId: "b", value: 6667 },
      ],
    },
  );
  assert.deepEqual(readSplitSpec("fixed", ["a", "b"], { a: "52,55", b: "0" }), {
    mode: "fixed",
    allocations: [
      { memberId: "a", value: 5255 },
      { memberId: "b", value: 0 },
    ],
  });
  assert.throws(() => readSplitSpec("fixed", ["a"], {}));
});

test("HTTP validation keeps defaults, trimming and legacy expense allocations", () => {
  const group = groupInput.parse({
    action: "group",
    name: " Casa ",
    currency: "BRL",
    category: "home",
    members: [" Ana "],
  });
  assert.equal(group.action, "group");
  if (group.action === "group") assert.deepEqual(group.members, ["Ana"]);
  const command = groupInput.parse({
    action: "expense",
    groupId: "11111111-1111-4111-8111-111111111111",
    payerId: "22222222-2222-4222-8222-222222222222",
    description: "Conta",
    amount: 1000,
    spentOn: "2026-10-16",
    memberIds: ["22222222-2222-4222-8222-222222222222"],
  });
  if (command.action !== "expense") assert.fail("expense expected");
  assert.deepEqual(command.split, { mode: "equal" });
  const legacyIds = Array.from(
    { length: 30 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
  assert.equal(
    groupInput.safeParse({ ...command, memberIds: legacyIds }).success,
    true,
  );
  assert.equal(
    groupInput.safeParse({
      ...command,
      memberIds: [...legacyIds, command.payerId],
    }).success,
    false,
  );
});

test("typed application and domain failures keep existing HTTP codes and messages", async () => {
  for (const [error, status, message] of [
    [
      new ApplicationError("DUPLICATE_MEMBER"),
      409,
      "Ja existe um participante com esse nome no grupo.",
    ],
    [
      new ApplicationError("MEMBER_LIMIT"),
      400,
      "O grupo atingiu o limite de 20 participantes.",
    ],
    [
      new ApplicationError("GROUP_NOT_FOUND"),
      400,
      "Grupo ou participantes invalidos. Atualize a pagina.",
    ],
    [
      new ApplicationError("INVALID_MEMBERS"),
      400,
      "Grupo ou participantes invalidos. Atualize a pagina.",
    ],
    [new SplitError("Partes invalidas"), 400, "Partes invalidas"],
    [new CurrencyError("Taxa invalida"), 400, "Taxa invalida"],
  ] as const) {
    const response = groupErrorResponse(error, "save");
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: message });
  }
  const log = console.error;
  console.error = () => {};
  try {
    for (const operation of ["load", "save"] as const) {
      const response = groupErrorResponse(
        new Error("private database detail"),
        operation,
      );
      assert.equal(response.status, 503);
      assert.doesNotMatch(
        JSON.stringify(await response.json()),
        /private database detail/,
      );
    }
  } finally {
    console.error = log;
  }
});
