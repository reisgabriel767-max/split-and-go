"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type {
  Category,
  Currency,
  Group,
  GroupData,
  SplitMode,
} from "../lib/types";
import type { GroupCommand } from "../application/groups";
import {
  calculateSplit,
  formatMoney,
  parseMoney,
  splitEqually,
} from "../lib/money";
import { MAX_GROUP_MEMBERS } from "../lib/limits";
import { convertMoney } from "../lib/fx";
import { calculateBalances, planSettlement } from "../lib/settlement";
import { readSplitSpec } from "../presentation/expense-form";
import {
  loadGroups,
  saveGroup,
  deleteGroup,
} from "../presentation/groups-client";
import { withoutGroup } from "../presentation/group-state";

const empty: GroupData = { groups: [], members: [], expenses: [], shares: [] };

export default function useWorkspace() {
  const [data, setData] = useState<GroupData>(empty);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<
    "group" | "expense" | "member" | "delete" | null
  >(null);
  const [tab, setTab] = useState("expenses");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState<Category>("trip");
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [percentageValues, setPercentageValues] = useState<
    Record<string, string>
  >({});
  const [fixedValues, setFixedValues] = useState<Record<string, string>>({});
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>("BRL");
  const [exchangeRate, setExchangeRate] = useState("");
  const [memberDetail, setMemberDetail] = useState<string | null>(null);
  const group = data.groups.find((g) => g.id === selected) ?? data.groups[0];
  const members = data.members.filter((m) => m.group_id === group?.id);
  const expenses = data.expenses.filter((e) => e.group_id === group?.id);
  const currency = group?.currency ?? "BRL";
  const money = (value: number) => formatMoney(value, currency);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? "Participante";
  const balances = useMemo(
    () =>
      calculateBalances(
        data.members.filter((m) => m.group_id === group?.id),
        data.expenses.filter((e) => e.group_id === group?.id),
        data.shares,
      ),
    [data, group?.id],
  );
  const plan = useMemo(() => planSettlement(balances), [balances]);
  let convertedPreview: number | null = null;
  try {
    convertedPreview = convertMoney(
      parseMoney(expenseAmount),
      expenseCurrency,
      currency,
      expenseCurrency === currency ? "1" : exchangeRate,
    ).amount;
  } catch {
    /* Incomplete forms have no converted preview. */
  }
  const outstanding = balances.reduce(
    (sum, member) => sum + Math.max(0, member.balance),
    0,
  );

  const refresh = useCallback(async () => {
    setData(await loadGroups());
    setLoadError("");
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  function open(kind: typeof modal) {
    setError("");
    setModal(kind);
    setDeleteTarget(kind === "delete" ? (group ?? null) : null);
    setDeleteConfirmation("");
    if (kind === "delete") return;
    setParticipants(members.map((m) => m.id));
    setSplitMode("equal");
    setExpenseAmount("");
    setExpenseCurrency(currency);
    setExchangeRate("");
    setFixedValues({});
    setPercentageValues(
      members.length
        ? Object.fromEntries(
            splitEqually(
              10000,
              members.map((m) => m.id),
            ).map((part) => [
              part.memberId,
              (part.amount / 100).toFixed(2).replace(".", ","),
            ]),
          )
        : {},
    );
  }
  function chooseGroup(id: string) {
    setSelected(id);
    setTab("expenses");
    setMemberDetail(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      if (modal === "delete") {
        if (!deleteTarget || deleteConfirmation !== deleteTarget.name)
          throw new Error("O nome informado deve ser igual ao nome do grupo.");
        await deleteGroup(deleteTarget.id);
        setData((current) => withoutGroup(current, deleteTarget.id));
        setSelected((current) =>
          current === deleteTarget.id ? null : current,
        );
        setTab("expenses");
        setMemberDetail(null);
        setModal(null);
        setDeleteTarget(null);
        setNotice("Grupo excluido.");
        try {
          await refresh();
        } catch {
          setLoadError(
            "O grupo foi excluido, mas a lista nao atualizou. Recarregue os grupos.",
          );
        }
        return;
      }
      let payload: GroupCommand;
      if (modal === "group") {
        const names = String(form.get("members"))
          .split(/[,\n]/)
          .map((n) => n.trim())
          .filter(Boolean);
        if (!names.length)
          throw new Error("Adicione pelo menos um participante.");
        if (names.length > MAX_GROUP_MEMBERS)
          throw new Error(
            `O grupo pode ter ate ${MAX_GROUP_MEMBERS} participantes.`,
          );
        if (new Set(names.map((n) => n.toLowerCase())).size !== names.length)
          throw new Error("Use um nome diferente para cada participante.");
        payload = {
          action: "group",
          name: String(form.get("name") ?? ""),
          currency: String(form.get("currency")) as Currency,
          category,
          members: names,
        };
      } else if (modal === "member") {
        payload = {
          action: "member",
          groupId: group!.id,
          name: String(form.get("name") ?? ""),
        };
      } else {
        if (!participants.length)
          throw new Error("Selecione quem participa da despesa.");
        const amount = parseMoney(String(form.get("amount")));
        const converted = convertMoney(
          amount,
          expenseCurrency,
          currency,
          expenseCurrency === currency ? "1" : exchangeRate,
        );
        const split = readSplitSpec(
          splitMode,
          participants,
          splitMode === "percentage" ? percentageValues : fixedValues,
        );
        calculateSplit(converted.amount, participants, split);
        payload = {
          action: "expense",
          groupId: group!.id,
          description: String(form.get("description") ?? ""),
          amount,
          payerId: String(form.get("payer") ?? ""),
          spentOn: String(form.get("date") ?? ""),
          memberIds: participants,
          split,
          currency: expenseCurrency,
          exchangeRate: converted.rate,
        };
      }
      const result = await saveGroup(payload);
      const kind = modal;
      // Close after a confirmed write so a failed refresh cannot cause a duplicate submission.
      setModal(null);
      if (kind === "group") chooseGroup(result.id);
      setNotice(
        kind === "group"
          ? "Grupo criado."
          : kind === "member"
            ? "Participante adicionado."
            : "Despesa registrada.",
      );
      try {
        await refresh();
      } catch {
        setLoadError(
          "Os dados foram salvos, mas a lista nao atualizou. Recarregue os grupos.",
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    data,
    group,
    members,
    expenses,
    currency,
    total,
    balances,
    plan,
    convertedPreview,
    outstanding,
    money,
    memberName,
    loading,
    setLoading,
    loadError,
    setLoadError,
    refresh,
    modal,
    setModal,
    tab,
    setTab,
    busy,
    deleteTarget,
    deleteConfirmation,
    setDeleteConfirmation,
    error,
    setError,
    notice,
    category,
    setCategory,
    participants,
    setParticipants,
    splitMode,
    setSplitMode,
    percentageValues,
    setPercentageValues,
    fixedValues,
    setFixedValues,
    expenseAmount,
    setExpenseAmount,
    expenseCurrency,
    setExpenseCurrency,
    exchangeRate,
    setExchangeRate,
    memberDetail,
    setMemberDetail,
    open,
    chooseGroup,
    submit,
  };
}

export type WorkspaceController = ReturnType<typeof useWorkspace>;
