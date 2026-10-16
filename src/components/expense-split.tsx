"use client";

import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDollarSign,
  Percent,
  Users,
} from "lucide-react";
import type { Member, SplitMode } from "@/lib/types";
import {
  calculateSplit,
  formatMoney,
  formatPercentage,
  parseMoney,
} from "@/lib/money";

export const splitLabels: Record<SplitMode, string> = {
  equal: "Divisao igualitaria",
  percentage: "Por percentual",
  fixed: "Valores fixos",
};

import { readSplitSpec } from "../presentation/expense-form";
export { readSplitSpec } from "../presentation/expense-form";

interface Props {
  members: Member[];
  participants: string[];
  mode: SplitMode;
  values: Record<string, string>;
  amount: string;
  currency: string;
  onMode: (mode: SplitMode) => void;
  onParticipants: (ids: string[]) => void;
  onValue: (id: string, value: string) => void;
}

export default function ExpenseSplit({
  members,
  participants,
  mode,
  values,
  amount,
  currency,
  onMode,
  onParticipants,
  onValue,
}: Props) {
  let cents = 0;
  try {
    cents = parseMoney(amount);
  } catch {
    /* An incomplete expense amount has no preview yet. */
  }
  let allocated: number | null = null;
  let preview = new Map<string, number>();
  try {
    const spec = readSplitSpec(mode, participants, values);
    if (spec.mode !== "equal")
      allocated = spec.allocations.reduce((sum, part) => sum + part.value, 0);
    if (cents)
      preview = new Map(
        calculateSplit(cents, participants, spec).map((part) => [
          part.memberId,
          part.amount,
        ]),
      );
  } catch {
    /* Validation on submit supplies the detailed error; never preview an invalid split. */
  }
  const target = mode === "percentage" ? 10000 : cents;
  const remaining = allocated === null ? null : target - allocated;
  const matches =
    remaining === 0 &&
    participants.length > 0 &&
    (mode === "percentage" || cents > 0);
  const format = (value: number) =>
    mode === "percentage"
      ? formatPercentage(value)
      : formatMoney(value, currency);

  return (
    <>
      <fieldset className="split-mode-field">
        <legend>Forma de divisao</legend>
        <div className="segmented split-modes">
          {(
            [
              ["equal", "Igual", Users],
              ["percentage", "Percentual", Percent],
              ["fixed", "Valor fixo", CircleDollarSign],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              type="button"
              key={id}
              aria-pressed={mode === id}
              className={mode === id ? "chosen" : ""}
              onClick={() => onMode(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="participant-field split-participants">
        <legend>
          {mode === "equal"
            ? "Dividir igualmente entre"
            : mode === "percentage"
              ? "Percentual por participante"
              : `Valor por participante (${currency})`}
        </legend>
        {members.map((member) => {
          const selected = participants.includes(member.id);
          return (
            <div
              className={`split-person ${selected ? "included" : ""}`}
              key={member.id}
            >
              <label
                className="participant-check"
                htmlFor={`participant-${member.id}`}
              >
                <input
                  id={`participant-${member.id}`}
                  type="checkbox"
                  checked={selected}
                  onChange={(event) =>
                    onParticipants(
                      event.target.checked
                        ? [...participants, member.id]
                        : participants.filter((id) => id !== member.id),
                    )
                  }
                />
                <span className="participant-name">{member.name}</span>
              </label>
              {selected &&
                (mode === "equal" ? (
                  <span className="share-preview">
                    {preview.has(member.id)
                      ? formatMoney(preview.get(member.id)!, currency)
                      : ""}
                  </span>
                ) : (
                  <div className="allocation-control">
                    <div className="allocation-input">
                      <input
                        aria-label={`${mode === "percentage" ? "Percentual" : "Valor"} de ${member.name}`}
                        inputMode="decimal"
                        value={values[member.id] ?? ""}
                        onChange={(event) =>
                          onValue(member.id, event.target.value)
                        }
                        placeholder="0,00"
                        maxLength={mode === "percentage" ? 6 : 10}
                        required
                      />
                      <span aria-hidden="true">
                        {mode === "percentage" ? "%" : currency}
                      </span>
                    </div>
                    {mode === "percentage" && preview.has(member.id) && (
                      <span className="share-preview">
                        {formatMoney(preview.get(member.id)!, currency)}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          );
        })}
      </fieldset>
      <div className="split-summary">
        <ArrowLeftRight size={16} />
        <span>
          {participants.length}{" "}
          {participants.length === 1
            ? "participante selecionado"
            : "participantes selecionados"}
        </span>
        <span>
          {mode === "equal"
            ? "Partes iguais"
            : mode === "percentage"
              ? "Percentuais"
              : currency}
        </span>
      </div>
      {mode !== "equal" && (
        <div
          className={`allocation-total ${matches ? "valid" : "pending"}`}
          role="status"
          aria-live="polite"
        >
          <div>
            <span>Total informado</span>
            <strong>
              {allocated === null ? "Valores incompletos" : format(allocated)}
            </strong>
          </div>
          <div>
            {matches ? (
              <>
                <CheckCircle2 size={15} />
                <span>Total confere</span>
              </>
            ) : remaining !== null && (mode === "percentage" || cents > 0) ? (
              <>
                <span>{remaining < 0 ? "Excedente" : "Faltam"}</span>
                <strong>{format(Math.abs(remaining))}</strong>
              </>
            ) : (
              <span>
                {mode === "percentage"
                  ? "Total esperado: 100%"
                  : "Preencha os valores"}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
