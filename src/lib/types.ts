export type Currency = "BRL" | "USD" | "EUR";
export type Category = "trip" | "home" | "event";
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
}
export interface Share {
  expense_id: string;
  member_id: string;
  amount: number;
}
export interface GroupData {
  groups: Group[];
  members: Member[];
  expenses: Expense[];
  shares: Share[];
}
