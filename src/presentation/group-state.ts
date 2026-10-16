import type { GroupData } from "../lib/types";

export function withoutGroup(data: GroupData, groupId: string): GroupData {
  const expenses = new Set(
    data.expenses.filter((e) => e.group_id === groupId).map((e) => e.id),
  );
  return {
    groups: data.groups.filter((g) => g.id !== groupId),
    members: data.members.filter((m) => m.group_id !== groupId),
    expenses: data.expenses.filter((e) => e.group_id !== groupId),
    shares: data.shares.filter((s) => !expenses.has(s.expense_id)),
  };
}
