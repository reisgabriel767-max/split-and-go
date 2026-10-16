import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ExpenseList from "../src/components/expense-list";
import ExpenseSplit from "../src/components/expense-split";
import CurrencyFields from "../src/components/currency-fields";
import GroupPanels from "../src/components/group-panels";
import { formatMoney } from "../src/lib/money";
import { calculateBalances, planSettlement } from "../src/lib/settlement";
import type { GroupData } from "../src/lib/types";

const data: GroupData = {
  groups: [
    {
      id: "g",
      name: "Grupo de teste",
      category: "trip",
      currency: "BRL",
      created_at: "2026-10-16",
    },
  ],
  members: [
    { id: "a", group_id: "g", name: "Ana" },
    { id: "b", group_id: "g", name: "Bruno" },
    { id: "c", group_id: "g", name: "Carla" },
  ],
  expenses: [
    {
      id: "e",
      group_id: "g",
      payer_id: "a",
      description: "Jantar <especial>",
      amount: 5255,
      spent_on: "2026-10-16",
      split_mode: "fixed",
      original_amount: 1001,
      original_currency: "USD",
      exchange_rate: "5.25",
    },
  ],
  shares: [
    { expense_id: "e", member_id: "a", amount: 2000, percentage: null },
    { expense_id: "e", member_id: "b", amount: 2000, percentage: null },
    { expense_id: "e", member_id: "c", amount: 1255, percentage: null },
  ],
};
const money = (value: number) => formatMoney(value, "BRL");
const memberName = (id: string) =>
  data.members.find((member) => member.id === id)!.name;
const noop = () => {};

test("expense table retains accessible headings, escaped descriptions, mobile metadata and FX history", () => {
  const html = renderToStaticMarkup(
    createElement(ExpenseList, {
      data,
      expenses: data.expenses,
      currency: "BRL",
      money,
      memberName,
    }),
  );
  assert.match(html, /<table[^>]*role="table"/);
  assert.equal((html.match(/scope="col"/g) ?? []).length, 5);
  assert.match(html, /Jantar &lt;especial&gt;/);
  assert.match(html, /dateTime="2026-10-16"/i);
  assert.match(html, /mobile-expense-meta/);
  assert.match(html, /Valores fixos/);
  assert.match(html, /52,55/);
  assert.match(html, /10,01/);
  assert.match(html, /1 USD = 5,25 BRL/);
});

test("all group panels retain balances, statement shares, members and minimum transfer plan", () => {
  const balances = calculateBalances(data.members, data.expenses, data.shares);
  const props = {
    data,
    group: data.groups[0],
    members: data.members,
    expenses: data.expenses,
    currency: "BRL" as const,
    money,
    memberName,
    balances,
    plan: planSettlement(balances),
    outstanding: 3255,
    memberDetail: null,
    setMemberDetail: noop,
    open: noop,
  };
  const render = (tab: string, memberDetail: string | null = null) =>
    renderToStaticMarkup(
      createElement(GroupPanels, { ...props, tab, memberDetail }),
    );
  assert.match(render("expenses"), /expense-list/);
  const balanceHtml = render("balances");
  assert.match(balanceHtml, /A receber/);
  assert.match(balanceHtml, /A pagar/);
  assert.match(render("balances", "b"), /Sua parte:.*20,00/);
  assert.match(render("members"), /3 de 20 participantes/);
  const settlementHtml = render("settlement");
  assert.match(settlementHtml, /Minimo verificado/);
  assert.match(settlementHtml, /Bruno/);
  assert.match(settlementHtml, /32,55/);
});

test("split controls render equal previews and distinguish matching and incomplete custom totals", () => {
  const props = {
    members: data.members,
    participants: ["a", "b", "c"],
    amount: "10,01",
    currency: "BRL",
    onMode: noop,
    onParticipants: noop,
    onValue: noop,
  };
  const equal = renderToStaticMarkup(
    createElement(ExpenseSplit, { ...props, mode: "equal", values: {} }),
  );
  assert.match(equal, /3,34/);
  assert.match(equal, /3,33/);
  assert.equal((equal.match(/aria-pressed="true"/g) ?? []).length, 1);
  for (const [mode, values] of [
    ["percentage", { a: "50", b: "25", c: "25" }],
    ["fixed", { a: "3,34", b: "3,34", c: "3,33" }],
  ] as const) {
    const valid = renderToStaticMarkup(
      createElement(ExpenseSplit, { ...props, mode, values }),
    );
    assert.match(valid, /Total confere/);
    const incomplete = renderToStaticMarkup(
      createElement(ExpenseSplit, { ...props, mode, values: {} }),
    );
    assert.match(incomplete, /allocation-total pending/);
    assert.doesNotMatch(incomplete, /Total confere/);
  }
});

test("currency fields keep source, rate and converted preview accessible without mutating conversion", () => {
  const html = renderToStaticMarkup(
    createElement(CurrencyFields, {
      source: "USD",
      target: "BRL",
      rate: "5.25",
      converted: 5255,
      onSource: noop,
      onRate: noop,
    }),
  );
  assert.match(html, /aria-label="Moeda da despesa"/);
  assert.match(html, /aria-label="Cotacao"/);
  assert.match(html, /52,55/);
  assert.match(html, /aria-live="polite"/);
});
