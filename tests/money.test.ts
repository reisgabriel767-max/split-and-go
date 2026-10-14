import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, splitEqually } from "../src/lib/money";

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
