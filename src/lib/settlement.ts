import type { Expense, Member, Share } from "./types";

export interface Balance extends Member {
  paid: number;
  owed: number;
  balance: number;
}
export interface Transfer {
  from: string;
  to: string;
  amount: number;
}
export interface Settlement {
  transfers: Transfer[];
  optimal: boolean;
}

export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  shares: Share[],
): Balance[] {
  const expenseIds = new Set(expenses.map((e) => e.id));
  return members.map((member) => {
    const paid = expenses
      .filter((e) => e.payer_id === member.id)
      .reduce((sum, e) => sum + e.amount, 0);
    const owed = shares
      .filter((s) => expenseIds.has(s.expense_id) && s.member_id === member.id)
      .reduce((sum, s) => sum + s.amount, 0);
    return { ...member, paid, owed, balance: paid - owed };
  });
}

function settleSubset(entries: { id: string; balance: number }[]): Transfer[] {
  const debtors = entries
    .filter((e) => e.balance < 0)
    .map((e) => ({ ...e, amount: -e.balance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const creditors = entries
    .filter((e) => e.balance > 0)
    .map((e) => ({ ...e, amount: e.balance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const transfers: Transfer[] = [];
  let d = 0,
    c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);
    transfers.push({ from: debtors[d].id, to: creditors[c].id, amount });
    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (!debtors[d].amount) d++;
    if (!creditors[c].amount) c++;
  }
  return transfers;
}

export function planSettlement(
  balances: { id: string; balance: number }[],
): Settlement {
  if (
    new Set(balances.map((b) => b.id)).size !== balances.length ||
    balances.some((b) => !Number.isSafeInteger(b.balance)) ||
    !Number.isSafeInteger(
      balances.reduce((sum, b) => sum + Math.abs(b.balance), 0),
    ) ||
    balances.reduce((sum, b) => sum + b.balance, 0) !== 0
  )
    throw new Error("Os saldos devem ser inteiros, unicos e somar zero.");
  const entries = balances
    .filter((b) => b.balance !== 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!entries.length) return { transfers: [], optimal: true };
  const greedy = settleSubset(entries);
  const lowerBound = Math.max(
    entries.filter((e) => e.balance < 0).length,
    entries.filter((e) => e.balance > 0).length,
  );
  if (greedy.length === lowerBound) return { transfers: greedy, optimal: true };
  if (entries.length > 20) return { transfers: greedy, optimal: false };

  // Maximize disjoint zero-sum subsets. Each subset needs size - 1 transfers;
  // therefore the minimum is n - number of zero-sum subsets.
  const size = 1 << entries.length;
  const sums = new Float64Array(size);
  const groups = new Uint8Array(size);
  for (let mask = 1; mask < size; mask++) {
    const bit = mask & -mask;
    sums[mask] = sums[mask ^ bit] + entries[31 - Math.clz32(bit)].balance;
    let best = 0;
    for (let remaining = mask; remaining; remaining &= remaining - 1) {
      const currentBit = remaining & -remaining;
      best = Math.max(best, groups[mask ^ currentBit]);
    }
    groups[mask] = best + (sums[mask] === 0 ? 1 : 0);
  }
  const transfers: Transfer[] = [];
  let mask = size - 1;
  let subset: typeof entries = [];
  while (mask) {
    for (let remaining = mask; remaining; remaining &= remaining - 1) {
      const bit = remaining & -remaining;
      const next = mask ^ bit;
      if (groups[mask] !== groups[next] + (sums[mask] === 0 ? 1 : 0)) continue;
      subset.push(entries[31 - Math.clz32(bit)]);
      mask = next;
      if (sums[mask] === 0) {
        transfers.push(...settleSubset(subset));
        subset = [];
      }
      break;
    }
  }
  return { transfers, optimal: true };
}
