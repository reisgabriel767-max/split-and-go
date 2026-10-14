import Decimal from "decimal.js";
import type { Currency } from "./types";

export class CurrencyError extends Error {}

export function convertMoney(
  amount: number,
  source: Currency,
  target: Currency,
  inputRate?: string,
) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 999999999)
    throw new CurrencyError("Valor original invalido.");
  const text = inputRate?.trim().replace(",", ".");
  if (source !== target && !text)
    throw new CurrencyError("Informe a cotacao para converter a despesa.");
  const rate = text || "1";
  if (!/^\d{1,6}(\.\d{1,6})?$/.test(rate) || new Decimal(rate).lte(0))
    throw new CurrencyError(
      "A cotacao deve ser positiva, com ate seis casas decimais.",
    );
  const decimal = new Decimal(rate);
  if (source === target && !decimal.eq(1))
    throw new CurrencyError("Despesas na moeda do grupo usam cotacao 1.");
  const converted = new Decimal(amount)
    .mul(decimal)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  if (converted < 1)
    throw new CurrencyError(
      "O valor convertido deve ser de pelo menos um centavo.",
    );
  if (converted > 999999999)
    throw new CurrencyError(
      "O valor convertido ultrapassa o limite de 9.999.999,99.",
    );
  return { amount: converted, rate: decimal.toFixed() };
}

export function moneyInput(cents: number) {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
}
