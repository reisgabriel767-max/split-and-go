import { test } from "node:test";
import assert from "node:assert/strict";
import { planSettlement, type Settlement } from "../src/lib/settlement";

const entries = (values: number[]) =>
  values.map((balance, index) => ({
    id: String(index).padStart(2, "0"),
    balance,
  }));
function assertSettles(
  values: { id: string; balance: number }[],
  result: Settlement,
) {
  const remaining = new Map(values.map((v) => [v.id, v.balance]));
  for (const transfer of result.transfers) {
    assert.ok(Number.isSafeInteger(transfer.amount) && transfer.amount > 0);
    assert.ok(values.find((v) => v.id === transfer.from)!.balance < 0);
    assert.ok(values.find((v) => v.id === transfer.to)!.balance > 0);
    remaining.set(
      transfer.from,
      remaining.get(transfer.from)! + transfer.amount,
    );
    remaining.set(transfer.to, remaining.get(transfer.to)! - transfer.amount);
  }
  assert.ok([...remaining.values()].every((amount) => amount === 0));
}

// Independent exhaustive debt-cancellation oracle for small test cases.
function oracle(input: number[]): number {
  const values = input.filter((v) => v !== 0);
  function search(index: number): number {
    while (index < values.length && !values[index]) index++;
    if (index === values.length) return 0;
    let best = Infinity;
    for (let other = index + 1; other < values.length; other++) {
      if (values[index] * values[other] >= 0) continue;
      values[other] += values[index];
      best = Math.min(best, 1 + search(index + 1));
      values[other] -= values[index];
    }
    return best;
  }
  return search(0);
}

test("settlement eliminates chains, ignores zero balances and handles cents", () => {
  for (const values of [
    [-5000, 0, 5000],
    [-334, -333, 667],
    [0, 0],
    [-1, 1],
  ]) {
    const rows = entries(values),
      result = planSettlement(rows);
    assertSettles(rows, result);
    assert.equal(result.optimal, true);
    assert.equal(result.transfers.length, oracle(values));
  }
});

test("exact solver beats largest-balance greedy on an adversarial case", () => {
  const rows = entries([-6, -5, -4, -3, 8, 10]);
  const result = planSettlement(rows);
  assert.equal(result.transfers.length, 4);
  assert.equal(result.optimal, true);
  assertSettles(rows, result);
});

test("exact subset plans match an independent exhaustive oracle", () => {
  let seed = 1729;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  }
  for (let trial = 0; trial < 100; trial++) {
    const values = Array.from({ length: 5 }, () => (random() % 17) - 8);
    values.push(-values.reduce((sum, v) => sum + v, 0));
    const rows = entries(values),
      result = planSettlement(rows);
    assert.equal(
      result.transfers.length,
      oracle(values),
      JSON.stringify(values),
    );
    assertSettles(rows, result);
    assert.deepEqual(result, planSettlement([...rows].reverse()));
  }
});

test("larger groups remain balanced and report when optimality is not certified", () => {
  const rows = entries(
    Array.from({ length: 5 }, () => [-6, -5, -4, -3, 8, 10]).flat(),
  );
  const result = planSettlement(rows);
  assert.equal(result.optimal, false);
  assertSettles(rows, result);
  assert.equal(
    planSettlement(entries(Array.from({ length: 15 }, () => [-5, 5]).flat()))
      .optimal,
    true,
  );
});

test("unbalanced, duplicate and fractional balances are rejected", () => {
  assert.throws(() => planSettlement(entries([1, 1])));
  assert.throws(() => planSettlement(entries([0.5, -0.5])));
  assert.throws(() =>
    planSettlement([
      { id: "a", balance: -1 },
      { id: "a", balance: 1 },
    ]),
  );
});

test("the exact solver handles twenty nonzero balances at its documented limit", () => {
  const values = [
    -6,
    -5,
    -4,
    -3,
    8,
    10,
    ...Array.from({ length: 7 }, (_, index) => [
      -101 - index,
      101 + index,
    ]).flat(),
  ];
  const rows = entries(values),
    result = planSettlement(rows);
  assert.equal(result.optimal, true);
  assert.equal(result.transfers.length, 11);
  assertSettles(rows, result);
});
