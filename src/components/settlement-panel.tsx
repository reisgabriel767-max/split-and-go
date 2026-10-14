import { ArrowRight, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { Balance, Settlement } from "@/lib/settlement";

export default function SettlementPanel({
  plan,
  balances,
  currency,
}: {
  plan: Settlement;
  balances: Balance[];
  currency: string;
}) {
  const name = (id: string) =>
    balances.find((member) => member.id === id)?.name ?? "Participante";
  if (!plan.transfers.length)
    return (
      <div className="empty-state">
        <span className="section-icon">
          <CheckCircle2 size={25} />
        </span>
        <h3>Tudo em dia</h3>
        <p>Nenhuma transferencia pendente.</p>
      </div>
    );
  return (
    <>
      <div className="balance-heading settlement-heading">
        <div>
          <h3>Plano de acerto</h3>
          <p>
            {plan.transfers.length}{" "}
            {plan.transfers.length === 1 ? "transferencia" : "transferencias"}{" "}
            <span className="dot-separator">/</span> {currency}
          </p>
        </div>
        <span className={`plan-badge ${plan.optimal ? "verified" : ""}`}>
          {plan.optimal ? "Minimo verificado" : "Plano simplificado"}
        </span>
      </div>
      <ol className="transfer-list">
        {plan.transfers.map((transfer, index) => (
          <li className="transfer-row" key={`${transfer.from}-${transfer.to}`}>
            <span className="transfer-number">{index + 1}</span>
            <div className="transfer-parties">
              <strong>{name(transfer.from)}</strong>
              <ArrowRight size={17} aria-label="paga para" />
              <strong>{name(transfer.to)}</strong>
            </div>
            <strong className="transfer-value">
              {formatMoney(transfer.amount, currency)}
            </strong>
          </li>
        ))}
      </ol>
      <div className="settlement-total">
        <ArrowLeftRight size={16} />
        <span>Total a transferir</span>
        <strong>
          {formatMoney(
            plan.transfers.reduce((sum, transfer) => sum + transfer.amount, 0),
            currency,
          )}
        </strong>
      </div>
    </>
  );
}
