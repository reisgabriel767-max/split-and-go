import type { SplitShare, SplitSpec } from "./types";

export function parseMoney(value: string, allowZero = false): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized))
    throw new Error("Informe um valor com ate duas casas decimais.");
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents < (allowZero ? 0 : 1) || cents > 999999999)
    throw new Error("Informe um valor entre 0,01 e 9.999.999,99.");
  return cents;
}

export function parsePercentage(value: string): number {
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Informe percentuais de 0 a 100 com ate duas casas decimais.",
    );
  const points = parseMoney(value, true);
  if (points > 10000)
    throw new Error("O percentual de cada pessoa deve estar entre 0 e 100%.");
  return points;
}

export function formatPercentage(points: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(points / 100)}%`;
}

export class SplitError extends Error {}

export function calculateSplit(
  amount: number,
  memberIds: string[],
  split: SplitSpec,
): SplitShare[] {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 999999999 ||
    !memberIds.length ||
    new Set(memberIds).size !== memberIds.length
  )
    throw new SplitError("Valor ou participantes invalidos.");
  if (split.mode === "equal") return splitEqually(amount, memberIds);

  const allocations = split.allocations;
  const ids = new Set(memberIds);
  if (
    allocations.length !== ids.size ||
    new Set(allocations.map((a) => a.memberId)).size !== ids.size ||
    allocations.some((a) => !ids.has(a.memberId))
  )
    throw new SplitError(
      "Informe uma parte para cada participante selecionado, sem repeticoes.",
    );
  const limit = split.mode === "percentage" ? 10000 : 999999999;
  if (
    allocations.some(
      (a) => !Number.isSafeInteger(a.value) || a.value < 0 || a.value > limit,
    )
  )
    throw new SplitError(
      "As partes devem ter valores validos e nao negativos.",
    );
  const sum = allocations.reduce((total, a) => total + a.value, 0);
  if (split.mode === "fixed") {
    if (sum !== amount)
      throw new SplitError(
        "A soma dos valores fixos deve ser igual ao total da despesa.",
      );
    return [...allocations]
      .sort((a, b) => a.memberId.localeCompare(b.memberId))
      .map((a) => ({ memberId: a.memberId, amount: a.value }));
  }
  if (sum !== 10000)
    throw new SplitError("Os percentuais devem somar exatamente 100%.");

  // Allocate remaining cents to the largest fractional remainders, with a stable ID tie-break.
  const parts = allocations.map((a) => ({
    memberId: a.memberId,
    amount: Math.floor((amount * a.value) / 10000),
    percentage: a.value,
    remainder: (amount * a.value) % 10000,
  }));
  const remaining =
    amount - parts.reduce((total, part) => total + part.amount, 0);
  parts.sort(
    (a, b) => b.remainder - a.remainder || a.memberId.localeCompare(b.memberId),
  );
  for (let index = 0; index < remaining; index++) parts[index].amount++;
  return parts
    .sort((a, b) => a.memberId.localeCompare(b.memberId))
    .map(({ memberId, amount, percentage }) => ({
      memberId,
      amount,
      percentage,
    }));
}

export function splitEqually(amount: number, memberIds: string[]) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !memberIds.length ||
    new Set(memberIds).size !== memberIds.length
  ) {
    throw new Error("Valor ou participantes invalidos.");
  }
  const ids = [...memberIds].sort();
  const base = Math.floor(amount / ids.length);
  const remainder = amount % ids.length;
  return ids.map((memberId, index) => ({
    memberId,
    amount: base + (index < remainder ? 1 : 0),
  }));
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    cents / 100,
  );
}
