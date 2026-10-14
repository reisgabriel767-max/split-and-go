export type Currency = "BRL" | "USD" | "EUR";
export type Category = "trip" | "home" | "event";
export type SplitMode = "equal" | "percentage" | "fixed";
export type SplitSpec =
  | { mode: "equal" }
  | {
      mode: "percentage" | "fixed";
      allocations: { memberId: string; value: number }[];
    };
export interface SplitShare {
  memberId: string;
  amount: number;
  percentage?: number;
}
export interface Group {
  id: string;
  name: string;
  currency: Currency;
  category: Category;
  created_at: string;
}
export interface Member {
  id: string;
  group_id: string;
  name: string;
}
export interface Expense {
  id: string;
  group_id: string;
  payer_id: string;
  description: string;
  amount: number;
  spent_on: string;
  split_mode: SplitMode;
}
export interface Share {
  expense_id: string;
  member_id: string;
  amount: number;
  percentage: number | null;
}
export interface GroupData {
  groups: Group[];
  members: Member[];
  expenses: Expense[];
  shares: Share[];
}
