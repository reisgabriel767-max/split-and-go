import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Plus,
  Receipt,
} from "lucide-react";
import type { Member } from "../lib/types";
import { MAX_GROUP_MEMBERS } from "../lib/limits";
import { formatMoney, formatPercentage } from "../lib/money";
import type { WorkspaceController } from "../hooks/use-workspace";
import { splitLabels } from "./expense-split";
import SettlementPanel from "./settlement-panel";
import ExpenseList from "./expense-list";

export function Avatar({
  member,
  index = 0,
}: {
  member: Member;
  index?: number;
}) {
  return (
    <span className={`avatar color-${index % 4}`} aria-hidden="true">
      {member.name
        .trim()
        .split(/\s+/)
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}

type Props = Pick<
  WorkspaceController,
  | "tab"
  | "data"
  | "group"
  | "members"
  | "expenses"
  | "currency"
  | "balances"
  | "plan"
  | "memberDetail"
  | "setMemberDetail"
  | "outstanding"
  | "open"
  | "money"
  | "memberName"
> & { group: NonNullable<WorkspaceController["group"]> };

export default function GroupPanels({
  tab,
  data,
  group,
  members,
  expenses,
  currency,
  balances,
  plan,
  memberDetail,
  setMemberDetail,
  outstanding,
  open,
  money,
  memberName,
}: Props) {
  return (
    <>
      {" "}
      {tab === "expenses" &&
        (expenses.length ? (
          <ExpenseList
            expenses={expenses}
            data={data}
            currency={currency}
            money={money}
            memberName={memberName}
          />
        ) : (
          <div className="empty-state">
            <span className="section-icon">
              <Receipt size={24} />
            </span>
            <h3>Uma conta para dividir?</h3>
            <p>As despesas de {group.name} ficam aqui.</p>
            <button
              className="button secondary"
              onClick={() => open("expense")}
            >
              <Plus size={16} /> Adicionar despesa
            </button>
          </div>
        ))}
      {tab === "balances" &&
        (memberDetail ? (
          <>
            <button
              className="back-button"
              onClick={() => setMemberDetail(null)}
            >
              <ArrowLeft size={15} /> Todos os saldos
            </button>
            <h3 className="statement-title">
              Extrato de {memberName(memberDetail)}
            </h3>
            {expenses
              .filter(
                (e) =>
                  e.payer_id === memberDetail ||
                  data.shares.some(
                    (s) =>
                      s.expense_id === e.id && s.member_id === memberDetail,
                  ),
              )
              .map((e) => {
                const share = data.shares.find(
                  (s) => s.expense_id === e.id && s.member_id === memberDetail,
                );
                return (
                  <div className="statement-row" key={e.id}>
                    <strong>
                      {e.description}
                      <span className="statement-mode">
                        {splitLabels[e.split_mode]}
                      </span>
                      {e.original_currency !== currency && (
                        <span className="statement-mode">
                          {formatMoney(e.original_amount, e.original_currency)}{" "}
                          <span className="dot-separator">/</span> 1{" "}
                          {e.original_currency} ={" "}
                          {new Intl.NumberFormat("pt-BR", {
                            maximumFractionDigits: 6,
                          }).format(Number(e.exchange_rate))}{" "}
                          {currency}
                        </span>
                      )}
                    </strong>
                    <div>
                      <span>
                        Pagou:{" "}
                        {money(e.payer_id === memberDetail ? e.amount : 0)}
                      </span>
                      <span>
                        Sua parte
                        {share?.percentage != null
                          ? ` (${formatPercentage(share.percentage)})`
                          : ""}
                        : {money(share?.amount ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            {!expenses.length && (
              <p className="muted">Nenhuma despesa registrada.</p>
            )}
          </>
        ) : (
          <>
            <div className="balance-heading">
              <h3>Saldos individuais</h3>
              <span className="muted">
                {outstanding === 0
                  ? "Tudo em dia"
                  : "Valores na moeda do grupo"}
              </span>
            </div>
            {balances.map((member, index) => (
              <button
                className="balance-row"
                key={member.id}
                onClick={() => setMemberDetail(member.id)}
              >
                <Avatar member={member} index={index} />
                <div className="balance-person">
                  <strong>{member.name}</strong>
                  <span>
                    Pagou {money(member.paid)}{" "}
                    <span className="dot-separator">/</span> Sua parte{" "}
                    {money(member.owed)}
                  </span>
                </div>
                <div
                  className={`balance-amount ${member.balance < 0 ? "orange-text" : member.balance > 0 ? "green-text" : "muted"}`}
                >
                  <strong>
                    {member.balance === 0 ? (
                      <Check size={17} />
                    ) : member.balance > 0 ? (
                      <ArrowDownLeft size={17} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                    {money(Math.abs(member.balance))}
                  </strong>
                  <span>
                    {member.balance === 0
                      ? "Em dia"
                      : member.balance > 0
                        ? "A receber"
                        : "A pagar"}
                  </span>
                </div>
                <ChevronRight className="balance-chevron" size={17} />
              </button>
            ))}
          </>
        ))}
      {tab === "settlement" && (
        <SettlementPanel plan={plan} balances={balances} currency={currency} />
      )}
      {tab === "members" && (
        <>
          <div className="balance-heading">
            <h3>Quem faz parte</h3>
            <span className="muted">
              {members.length > MAX_GROUP_MEMBERS
                ? `${members.length} participantes (grupo legado)`
                : `${members.length} de ${MAX_GROUP_MEMBERS} participantes`}
            </span>
          </div>
          {members.map((member, index) => (
            <div className="member-row" key={member.id}>
              <Avatar member={member} index={index} />
              <strong>{member.name}</strong>
            </div>
          ))}
        </>
      )}
    </>
  );
}
