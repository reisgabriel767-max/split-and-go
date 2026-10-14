import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSplit,
  parseMoney,
  parsePercentage,
  splitEqually,
} from "../src/lib/money";

test("parses decimal currency without binary floating point rounding", () => {
  assert.equal(parseMoney("10,01"), 1001);
  assert.equal(parseMoney("0.29"), 29);
  for (const value of ["0", "-1", "1.001", "1e3", "NaN", "", "1.000,00"])
    assert.throws(() => parseMoney(value));
});

test("equal shares preserve every cent and use stable member IDs", () => {
  assert.deepEqual(splitEqually(1000, ["c", "b", "a"]), [
    { memberId: "a", amount: 334 },
    { memberId: "b", amount: 333 },
    { memberId: "c", amount: 333 },
  ]);
  for (let cents = 1; cents <= 1000; cents++) {
    const parts = splitEqually(cents, ["c", "a", "b"]);
    assert.equal(
      parts.reduce((sum, part) => sum + part.amount, 0),
      cents,
    );
    assert.ok(
      Math.max(...parts.map((p) => p.amount)) -
        Math.min(...parts.map((p) => p.amount)) <=
        1,
    );
  }
});

test("splitting rejects invalid amounts and duplicated or empty participants", () => {
  assert.throws(() => splitEqually(0, ["a"]));
  assert.throws(() => splitEqually(10.1, ["a"]));
  assert.throws(() => splitEqually(1, []));
  assert.throws(() => splitEqually(1, ["a", "a"]));
});

test("percentage inputs retain two decimal places and accept zero without accepting invalid precision", () => {
  assert.equal(parsePercentage("33,33"), 3333);
  assert.equal(parsePercentage("100.00"), 10000);
  assert.equal(parsePercentage("0"), 0);
  assert.equal(parseMoney("0,00", true), 0);
  for (const value of ["100,01", "-1", "0.001", "1e2", "", "NaN"])
    assert.throws(() => parsePercentage(value));
});

test("percentage shares allocate by largest remainder with stable tie-breaking", () => {
  const spec = {
    mode: "percentage" as const,
    allocations: [
      { memberId: "a", value: 5000 },
      { memberId: "b", value: 3000 },
      { memberId: "c", value: 2000 },
    ],
  };
  assert.deepEqual(calculateSplit(1001, ["c", "b", "a"], spec), [
    { memberId: "a", amount: 501, percentage: 5000 },
    { memberId: "b", amount: 300, percentage: 3000 },
    { memberId: "c", amount: 200, percentage: 2000 },
  ]);
  const tied = {
    mode: "percentage" as const,
    allocations: [
      { memberId: "b", value: 5000 },
      { memberId: "a", value: 5000 },
      { memberId: "c", value: 0 },
    ],
  };
  assert.deepEqual(
    calculateSplit(1, ["a", "b", "c"], tied).map((p) => p.amount),
    [1, 0, 0],
  );
  for (const amount of [1, 2, 99, 100, 1001, 999999999]) {
    const parts = calculateSplit(amount, ["a", "b", "c"], spec);
    assert.equal(
      parts.reduce((sum, part) => sum + part.amount, 0),
      amount,
    );
    assert.deepEqual(
      parts,
      calculateSplit(amount, ["c", "a", "b"], {
        ...spec,
        allocations: [...spec.allocations].reverse(),
      }),
    );
    for (const part of parts)
      assert.ok(
        Math.abs(part.amount - (amount * part.percentage!) / 10000) < 1,
      );
  }
});

test("fixed shares preserve exact amounts, including zero, and require the full total", () => {
  const allocations = [
    { memberId: "a", value: 700 },
    { memberId: "b", value: 301 },
    { memberId: "c", value: 0 },
  ];
  assert.deepEqual(
    calculateSplit(1001, ["a", "b", "c"], { mode: "fixed", allocations }),
    [
      { memberId: "a", amount: 700 },
      { memberId: "b", amount: 301 },
      { memberId: "c", amount: 0 },
    ],
  );
  assert.throws(
    () => calculateSplit(1000, ["a", "b", "c"], { mode: "fixed", allocations }),
    /soma dos valores fixos/,
  );
});

test("custom shares reject incorrect totals, missing members, duplicates and invalid numeric units", () => {
  for (const mode of ["percentage", "fixed"] as const) {
    const total = mode === "percentage" ? 10000 : 100;
    for (const allocations of [
      [
        { memberId: "a", value: total - 1 },
        { memberId: "b", value: 0 },
      ],
      [
        { memberId: "a", value: total + 1 },
        { memberId: "b", value: 0 },
      ],
      [{ memberId: "a", value: total }],
      [
        { memberId: "a", value: total },
        { memberId: "a", value: 0 },
      ],
      [
        { memberId: "a", value: total },
        { memberId: "c", value: 0 },
      ],
      [
        { memberId: "a", value: total + 1 },
        { memberId: "b", value: -1 },
      ],
      [
        { memberId: "a", value: total - 0.5 },
        { memberId: "b", value: 0.5 },
      ],
    ])
      assert.throws(() =>
        calculateSplit(100, ["a", "b"], { mode, allocations }),
      );
  }
});
