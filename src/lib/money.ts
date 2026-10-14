export function parseMoney(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized))
    throw new Error("Informe um valor com ate duas casas decimais.");
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0 || cents > 999999999)
    throw new Error("Informe um valor entre 0,01 e 9.999.999,99.");
  return cents;
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
