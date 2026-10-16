import type {
  GroupRepository,
  GroupTransaction,
} from "../application/group-repository";
import { ApplicationError } from "../application/errors";
import type {
  Currency,
  Expense,
  Group,
  GroupData,
  Member,
  Share,
} from "../lib/types";
import type { Database } from "./database";

function transactionRepository(tx: Database): GroupTransaction {
  return {
    async insertGroup(group) {
      await tx.query(
        "INSERT INTO groups (id, name, currency, category) VALUES ($1,$2,$3,$4)",
        [group.id, group.name, group.currency, group.category],
      );
    },
    async insertMember(member) {
      await tx.query(
        "INSERT INTO members (id, group_id, name) VALUES ($1,$2,$3)",
        [member.id, member.groupId, member.name],
      );
    },
    async lockGroup(id) {
      const rows = await tx.query<{ id: string; currency: Currency }>(
        "SELECT id,currency FROM groups WHERE id=$1 FOR UPDATE",
        [id],
      );
      return rows[0];
    },
    async countMembers(groupId) {
      const [row] = await tx.query<{ count: string }>(
        "SELECT count(*) FROM members WHERE group_id=$1",
        [groupId],
      );
      return Number(row.count);
    },
    async memberIds(groupId) {
      return (
        await tx.query<{ id: string }>(
          "SELECT id FROM members WHERE group_id=$1",
          [groupId],
        )
      ).map((m) => m.id);
    },
    async insertExpense(expense, shares) {
      await tx.query(
        "INSERT INTO expenses (id,group_id,payer_id,description,amount,spent_on,split_mode,original_amount,original_currency,exchange_rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          expense.id,
          expense.groupId,
          expense.payerId,
          expense.description,
          expense.amount,
          expense.spentOn,
          expense.splitMode,
          expense.originalAmount,
          expense.originalCurrency,
          expense.exchangeRate,
        ],
      );
      for (const share of shares)
        await tx.query(
          "INSERT INTO expense_shares (expense_id,group_id,member_id,amount,percentage) VALUES ($1,$2,$3,$4,$5)",
          [
            expense.id,
            expense.groupId,
            share.memberId,
            share.amount,
            share.percentage ?? null,
          ],
        );
    },
  };
}

export class SqlGroupRepository implements GroupRepository {
  constructor(private readonly getDatabase: () => Promise<Database>) {}
  async transaction<T>(
    operation: (tx: GroupTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await this.getDatabase();
    try {
      return await db.transaction((tx) => operation(transactionRepository(tx)));
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new ApplicationError("DUPLICATE_MEMBER");
      throw error;
    }
  }
  async getSnapshot(): Promise<GroupData> {
    const db = await this.getDatabase();
    return db.transaction(async (tx) => {
      await tx.exec(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      return {
        groups: await tx.query<Group>(
          "SELECT * FROM groups ORDER BY created_at, id",
        ),
        members: await tx.query<Member>(
          "SELECT id, group_id, name FROM members ORDER BY created_at, id",
        ),
        expenses: await tx.query<Expense>(
          "SELECT id, group_id, payer_id, description, amount, split_mode, original_amount, original_currency, exchange_rate::text, to_char(spent_on, 'YYYY-MM-DD') AS spent_on FROM expenses ORDER BY spent_on DESC, created_at DESC, id",
        ),
        shares: await tx.query<Share>(
          "SELECT expense_id, member_id, amount, percentage FROM expense_shares",
        ),
      };
    });
  }
}
