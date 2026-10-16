import { calculateSplit } from "../lib/money";
import { convertMoney } from "../lib/fx";
import { MAX_GROUP_MEMBERS } from "../lib/limits";
import type { Category, Currency, SplitSpec } from "../lib/types";
import type { GroupRepository } from "./group-repository";
import { ApplicationError } from "./errors";

export interface CreateGroupInput {
  name: string;
  currency: Currency;
  category: Category;
  members: string[];
}
export interface AddGroupMemberInput {
  groupId: string;
  name: string;
}
export interface CreateExpenseInput {
  groupId: string;
  payerId: string;
  description: string;
  amount: number;
  spentOn: string;
  memberIds: string[];
  split: SplitSpec;
  currency?: Currency;
  exchangeRate?: string;
}
export type GroupCommand =
  | (CreateGroupInput & { action: "group" })
  | (AddGroupMemberInput & { action: "member" })
  | (CreateExpenseInput & { action: "expense" });

export function createGroupUseCases(
  repository: GroupRepository,
  newId: () => string,
) {
  return {
    getGroupsSnapshot: () => repository.getSnapshot(),
    async deleteGroup(groupId: string) {
      return repository.transaction(async (tx) => {
        if (await tx.lockGroup(groupId)) await tx.deleteGroup(groupId);
      });
    },
    async createGroup(input: CreateGroupInput) {
      if (
        !input.members.length ||
        input.members.length > MAX_GROUP_MEMBERS ||
        new Set(input.members.map((name) => name.toLowerCase())).size !==
          input.members.length
      )
        throw new ApplicationError("INVALID_INPUT");
      return repository.transaction(async (tx) => {
        const id = newId();
        await tx.insertGroup({
          id,
          name: input.name,
          currency: input.currency,
          category: input.category,
        });
        for (const name of input.members)
          await tx.insertMember({ id: newId(), groupId: id, name });
        return id;
      });
    },
    async addGroupMember(input: AddGroupMemberInput) {
      return repository.transaction(async (tx) => {
        if (!(await tx.lockGroup(input.groupId)))
          throw new ApplicationError("GROUP_NOT_FOUND");
        if ((await tx.countMembers(input.groupId)) >= MAX_GROUP_MEMBERS)
          throw new ApplicationError("MEMBER_LIMIT");
        const id = newId();
        await tx.insertMember({ id, groupId: input.groupId, name: input.name });
        return id;
      });
    },
    async createExpense(input: CreateExpenseInput) {
      return repository.transaction(async (tx) => {
        const group = await tx.lockGroup(input.groupId);
        if (!group) throw new ApplicationError("GROUP_NOT_FOUND");
        const originalCurrency = input.currency ?? group.currency;
        const converted = convertMoney(
          input.amount,
          originalCurrency,
          group.currency,
          input.exchangeRate,
        );
        const shares = calculateSplit(
          converted.amount,
          input.memberIds,
          input.split,
        );
        const ids = new Set(await tx.memberIds(input.groupId));
        if (
          !ids.has(input.payerId) ||
          input.memberIds.some((id) => !ids.has(id))
        )
          throw new ApplicationError("INVALID_MEMBERS");
        const id = newId();
        await tx.insertExpense(
          {
            id,
            groupId: input.groupId,
            payerId: input.payerId,
            description: input.description,
            amount: converted.amount,
            spentOn: input.spentOn,
            splitMode: input.split.mode,
            originalAmount: input.amount,
            originalCurrency,
            exchangeRate: converted.rate,
          },
          shares,
        );
        return id;
      });
    },
  };
}
