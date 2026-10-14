import { test } from "node:test";
import assert from "node:assert/strict";
import { convertMoney, moneyInput } from "../src/lib/fx";

test("currency conversion rounds once half-up using decimal arithmetic", () => {
  assert.deepEqual(convertMoney(1001, "USD", "BRL", "5,25"), {
    amount: 5255,
    rate: "5.25",
  });
  assert.equal(convertMoney(1, "USD", "BRL", "0.5").amount, 1);
  assert.equal(convertMoney(29, "USD", "BRL", "1.5").amount, 44);
  assert.equal(convertMoney(1000, "EUR", "BRL", "5.123456").amount, 5123);
  assert.deepEqual(convertMoney(1001, "BRL", "BRL"), {
    amount: 1001,
    rate: "1",
  });
  assert.equal(moneyInput(1001), "10,01");
});

test("invalid rates, unrepresentable converted totals and non-unit same-currency rates are rejected", () => {
  for (const rate of [
    undefined,
    "",
    "0",
    "-1",
    "NaN",
    "1e2",
    "1.0000001",
    "1000000",
    "Infinity",
  ])
    assert.throws(() => convertMoney(1000, "USD", "BRL", rate));
  assert.throws(() => convertMoney(1000, "BRL", "BRL", "2"));
  assert.throws(() => convertMoney(1, "USD", "BRL", "0.001"));
  assert.throws(() => convertMoney(999999999, "USD", "BRL", "2"));
});
