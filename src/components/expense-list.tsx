import { Receipt } from "lucide-react";
import type { WorkspaceController } from "../hooks/use-workspace";
import { formatMoney } from "../lib/money";
import { splitLabels } from "./expense-split";

type Props = Pick<
  WorkspaceController,
  "expenses" | "data" | "currency" | "money" | "memberName"
>;

export default function ExpenseList({
  expenses,
  data,
  currency,
  money,
  memberName,
}: Props) {
  return (
    <table className="expense-list" role="table">
      <caption className="sr-only">
        Despesas do grupo, pagadores e valores
      </caption>
      <thead role="rowgroup">
        <tr className="table-heading" role="row">
          <th scope="col">Despesa</th>
          <th scope="col" className="expense-date">
            Data
          </th>
          <th scope="col" className="payer">
            Quem pagou
          </th>
          <th scope="col" className="expense-mode">
            Rateio
          </th>
          <th scope="col">Valor</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {expenses.map((expense) => {
          const date = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${expense.spent_on}T12:00:00Z`));
          return (
            <tr key={expense.id} className="expense-row" role="row">
              <td className="expense-info" role="cell">
                <span className="receipt-icon" aria-hidden="true">
                  <Receipt size={18} />
                </span>
                <div>
                  <strong title={expense.description}>
                    {expense.description}
                  </strong>
                  <p>
                    {
                      data.shares.filter((s) => s.expense_id === expense.id)
                        .length
                    }{" "}
                    participantes
                  </p>
                  <p className="mobile-expense-meta">
                    {date} / {memberName(expense.payer_id)}
                  </p>
                  <p className="mobile-expense-meta">
                    {splitLabels[expense.split_mode]}
                  </p>
                </div>
              </td>
              <td className="expense-date" role="cell">
                <time dateTime={expense.spent_on}>{date}</time>
              </td>
              <td className="payer" role="cell">
                {memberName(expense.payer_id)}
              </td>
              <td className="expense-mode" role="cell">
                <span>{splitLabels[expense.split_mode]}</span>
              </td>
              <td className="expense-value" role="cell">
                <strong>{money(expense.amount)}</strong>
                {expense.original_currency !== currency && (
                  <span className="original-value">
                    {formatMoney(
                      expense.original_amount,
                      expense.original_currency,
                    )}
                    <br />1 {expense.original_currency} ={" "}
                    {new Intl.NumberFormat("pt-BR", {
                      maximumFractionDigits: 6,
                    }).format(Number(expense.exchange_rate))}{" "}
                    {currency}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
