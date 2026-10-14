"use client";

import { ArrowLeftRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/types";

interface Props {
  source: Currency;
  target: Currency;
  rate: string;
  converted: number | null;
  onSource: (currency: Currency) => void;
  onRate: (rate: string) => void;
}

export default function CurrencyFields({
  source,
  target,
  rate,
  converted,
  onSource,
  onRate,
}: Props) {
  return (
    <>
      <label>
        Moeda da despesa
        <select
          aria-label="Moeda da despesa"
          value={source}
          onChange={(event) => onSource(event.target.value as Currency)}
        >
          <option value="BRL">BRL - Real brasileiro</option>
          <option value="USD">USD - Dolar americano</option>
          <option value="EUR">EUR - Euro</option>
        </select>
      </label>
      {source !== target && (
        <>
          <label>
            Cotacao ({target} por 1 {source})
            <input
              aria-label="Cotacao"
              value={rate}
              onChange={(event) => onRate(event.target.value)}
              inputMode="decimal"
              placeholder="0,000000"
              maxLength={13}
              required
            />
          </label>
          <div className="conversion-preview" role="status" aria-live="polite">
            <span>
              <ArrowLeftRight size={16} />
              Total em {target}
            </span>
            <strong>
              {converted === null ? "..." : formatMoney(converted, target)}
            </strong>
          </div>
        </>
      )}
    </>
  );
}
