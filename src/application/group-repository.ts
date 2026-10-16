import type {
  Category,
  Currency,
  Group,
  GroupData,
  SplitMode,
  SplitShare,
} from "../lib/types";

export interface ExpenseRecord {
  id: string;
  groupId: string;
  payerId: string;
  description: string;
  amount: number;
  spentOn: string;
  splitMode: SplitMode;
  originalAmount: number;
  originalCurrency: Currency;
  exchangeRate: string;
}

export interface GroupTransaction {
  insertGroup(group: {
    id: string;
    name: string;
    currency: Currency;
    category: Category;
  }): Promise<void>;
  insertMember(member: {
    id: string;
    groupId: string;
    name: string;
  }): Promise<void>;
  lockGroup(id: string): Promise<Pick<Group, "id" | "currency"> | undefined>;
  countMembers(groupId: string): Promise<number>;
  memberIds(groupId: string): Promise<string[]>;
  insertExpense(expense: ExpenseRecord, shares: SplitShare[]): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
}

export interface GroupRepository {
  transaction<T>(operation: (tx: GroupTransaction) => Promise<T>): Promise<T>;
  getSnapshot(): Promise<GroupData>;
}
