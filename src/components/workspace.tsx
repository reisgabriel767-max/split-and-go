"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Home,
  LoaderCircle,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  TentTree,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type {
  Category,
  Currency,
  GroupData,
  Member,
  SplitMode,
} from "@/lib/types";
import {
  calculateSplit,
  formatMoney,
  formatPercentage,
  parseMoney,
  splitEqually,
} from "@/lib/money";
import ExpenseSplit, {
  readSplitSpec,
  splitLabels,
} from "@/components/expense-split";

import CurrencyFields from "@/components/currency-fields";
import SettlementPanel from "@/components/settlement-panel";
import { convertMoney, moneyInput } from "@/lib/fx";
import { calculateBalances, planSettlement } from "@/lib/settlement";

const categories = {
  trip: {
    label: "Viagem",
    icon: TentTree,
    image:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
  },
  home: {
    label: "Casa",
    icon: Home,
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  },
  event: {
    label: "Evento",
    icon: Sparkles,
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
  },
};
const empty: GroupData = { groups: [], members: [], expenses: [], shares: [] };

function Avatar({ member, index = 0 }: { member: Member; index?: number }) {
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

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Fechar"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Workspace() {
  const [data, setData] = useState<GroupData>(empty);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<"group" | "expense" | "member" | null>(
    null,
  );
  const [tab, setTab] = useState("expenses");
  const [busy, setBusy] = useState(false);
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
    const response = await fetch("/api/groups", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error ?? "Falha ao carregar os grupos.");
    setData(body);
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
      let payload: object;
      if (modal === "group") {
        const names = String(form.get("members"))
          .split(/[,\n]/)
          .map((n) => n.trim())
          .filter(Boolean);
        if (!names.length)
          throw new Error("Adicione pelo menos um participante.");
        if (new Set(names.map((n) => n.toLowerCase())).size !== names.length)
          throw new Error("Use um nome diferente para cada participante.");
        payload = {
          action: "group",
          name: form.get("name"),
          currency: form.get("currency"),
          category,
          members: names,
        };
      } else if (modal === "member") {
        payload = {
          action: "member",
          groupId: group?.id,
          name: form.get("name"),
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
          groupId: group?.id,
          description: form.get("description"),
          amount,
          payerId: form.get("payer"),
          spentOn: form.get("date"),
          memberIds: participants,
          split,
          currency: expenseCurrency,
          exchangeRate: converted.rate,
        };
      }
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Nao foi possivel salvar.");
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

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Split&Go inicio">
          <span className="brand-mark">
            <ArrowLeftRight size={22} />
          </span>
          Split<span className="brand-amp">&</span>Go
          <span className="brand-dot">.</span>
        </a>
        <div className="sidebar-label">SEU ESPACO</div>
        <div className="sidebar-active">
          <Wallet size={18} /> Meus grupos{" "}
          <span className="count">{data.groups.length}</span>
        </div>
        <div className="group-nav-heading">
          <span>GRUPOS</span>
          <button
            className="icon-button"
            aria-label="Criar grupo"
            title="Criar grupo"
            onClick={() => open("group")}
            disabled={loading || !!loadError}
          >
            <Plus size={17} />
          </button>
        </div>
        <nav aria-label="Grupos" className="group-nav">
          {data.groups.map((g) => {
            const Icon = categories[g.category].icon;
            return (
              <button
                key={g.id}
                className={
                  group?.id === g.id ? "group-link selected" : "group-link"
                }
                onClick={() => chooseGroup(g.id)}
              >
                <Icon size={17} />
                <span>{g.name}</span>
                <ChevronRight size={14} />
              </button>
            );
          })}
          {!data.groups.length && (
            <p className="nav-empty">Seus grupos aparecem aqui.</p>
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="small-logo">
            <ArrowLeftRight size={17} />
          </span>
          <div>
            Contas em dia.
            <br />
            <strong>Boas historias pela frente.</strong>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Meu espaco <ChevronRight size={14} /> <strong>Meus grupos</strong>
          </span>
          <span className="local-badge">
            <span /> Espaco pessoal
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">DESPESAS COMPARTILHADAS</p>
              <h1>Meus grupos</h1>
              <p className="muted">Tudo dividido. Tudo em ordem.</p>
            </div>
            <button
              className="button primary"
              onClick={() => open("group")}
              disabled={loading || !!loadError}
            >
              <Plus size={17} /> Novo grupo
            </button>
          </div>
          {notice && (
            <div className="toast" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          {loadError && (
            <div className="error-banner" role="alert">
              <span>{loadError}</span>
              <button
                className="button secondary"
                onClick={() => {
                  setLoading(true);
                  refresh()
                    .catch((err) => setLoadError(err.message))
                    .finally(() => setLoading(false));
                }}
              >
                <RefreshCw size={15} /> Tentar novamente
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading" role="status">
              <LoaderCircle className="spin" size={25} /> Carregando seus
              grupos...
            </div>
          ) : !group ? (
            <section className="welcome">
              <div
                className="welcome-photo"
                role="img"
                aria-label="Lago entre montanhas, destino de uma viagem em grupo"
              />
              <div className="welcome-content">
                <span className="section-icon">
                  <Users size={24} />
                </span>
                <p className="eyebrow">O PRIMEIRO PASSO</p>
                <h2>
                  Boas companhias.
                  <br />
                  Contas simples.
                </h2>
                <p>
                  Uma viagem, a casa ou aquele encontro.
                  <br />
                  Cada grupo tem seu lugar.
                </p>
                <button
                  className="button primary"
                  disabled={!!loadError}
                  onClick={() => open("group")}
                >
                  Criar meu primeiro grupo <ArrowRight size={17} />
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="group-overview" aria-label="Resumo do grupo">
                <div
                  className={`group-cover ${group.category}`}
                  style={{
                    backgroundImage: `url("${categories[group.category].image}")`,
                  }}
                >
                  <span className="category-label">
                    {categories[group.category].label}
                  </span>
                </div>
                <div className="group-heading">
                  <div>
                    <div className="group-title-row">
                      <h2>{group.name}</h2>
                      <span className="currency-label">{group.currency}</span>
                    </div>
                    <p className="muted">
                      {members.length}{" "}
                      {members.length === 1 ? "participante" : "participantes"}{" "}
                      <span className="dot-separator">/</span> {expenses.length}{" "}
                      {expenses.length === 1 ? "despesa" : "despesas"}
                    </p>
                  </div>
                  <div className="avatar-stack" aria-label="Participantes">
                    {members.slice(0, 4).map((member, index) => (
                      <Avatar key={member.id} member={member} index={index} />
                    ))}
                    {members.length > 4 && (
                      <span className="avatar overflow-avatar">
                        +{members.length - 4}
                      </span>
                    )}
                  </div>
                </div>
                <div className="stats">
                  <div>
                    <span>
                      <Receipt size={16} /> Total de despesas
                    </span>
                    <strong>{money(total)}</strong>
                  </div>
                  <div>
                    <span>
                      <ArrowLeftRight size={16} /> Saldo a acertar
                    </span>
                    <strong
                      className={outstanding ? "orange-text" : "green-text"}
                    >
                      {money(outstanding)}
                    </strong>
                  </div>
                  <div>
                    <span>
                      <Users size={16} /> Media por participante
                    </span>
                    <strong>
                      {money(
                        members.length ? Math.round(total / members.length) : 0,
                      )}
                    </strong>
                  </div>
                </div>
              </section>
              <div className="content-heading">
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="Detalhes do grupo"
                >
                  {[
                    ["expenses", "Despesas", Receipt],
                    ["balances", "Saldos", Wallet],
                    ["members", "Participantes", Users],
                    ["settlement", "Acerto", ArrowLeftRight],
                  ].map(([id, label, Icon]) => {
                    const TabIcon = Icon as typeof Receipt;
                    return (
                      <button
                        role="tab"
                        key={String(id)}
                        aria-selected={tab === id}
                        id={`tab-${id}`}
                        aria-controls={`panel-${id}`}
                        className={tab === id ? "tab active" : "tab"}
                        onClick={() => {
                          setTab(String(id));
                          setMemberDetail(null);
                        }}
                      >
                        <TabIcon size={16} />
                        <span>{String(label)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="button primary"
                  onClick={() => open(tab === "members" ? "member" : "expense")}
                >
                  <Plus size={16} />
                  {tab === "members" ? "Participante" : "Nova despesa"}
                </button>
              </div>
              <section
                className="tab-panel"
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
              >
                {tab === "expenses" &&
                  (expenses.length ? (
                    <div className="expense-list">
                      <div className="table-heading">
                        <span>DESPESA</span>
                        <span>QUEM PAGOU</span>
                        <span>VALOR</span>
                      </div>
                      {expenses.map((expense) => (
                        <div key={expense.id} className="expense-row">
                          <div className="expense-info">
                            <span className="receipt-icon">
                              <Receipt size={19} />
                            </span>
                            <div>
                              <strong>{expense.description}</strong>
                              <p>
                                {new Intl.DateTimeFormat("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  timeZone: "UTC",
                                }).format(
                                  new Date(`${expense.spent_on}T12:00:00Z`),
                                )}{" "}
                                <span className="dot-separator">/</span>{" "}
                                {
                                  data.shares.filter(
                                    (s) => s.expense_id === expense.id,
                                  ).length
                                }{" "}
                                pessoas
                              </p>
                            </div>
                          </div>
                          <span className="payer">
                            {memberName(expense.payer_id)}
                          </span>
                          <div className="expense-value">
                            <strong>{money(expense.amount)}</strong>
                            <span>{splitLabels[expense.split_mode]}</span>
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
                          </div>
                        </div>
                      ))}
                    </div>
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
                                s.expense_id === e.id &&
                                s.member_id === memberDetail,
                            ),
                        )
                        .map((e) => {
                          const share = data.shares.find(
                            (s) =>
                              s.expense_id === e.id &&
                              s.member_id === memberDetail,
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
                                    {formatMoney(
                                      e.original_amount,
                                      e.original_currency,
                                    )}{" "}
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
                                  {money(
                                    e.payer_id === memberDetail ? e.amount : 0,
                                  )}
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
                            className={`balance-amount ${member.balance < 0 ? "orange-text" : "green-text"}`}
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
                  <SettlementPanel
                    plan={plan}
                    balances={balances}
                    currency={currency}
                  />
                )}
                {tab === "members" && (
                  <>
                    <div className="balance-heading">
                      <h3>Quem faz parte</h3>
                      <span className="muted">
                        {members.length} de 30 participantes
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
              </section>
              <footer className="page-footer">
                <span>
                  <CheckCircle2 size={14} />{" "}
                  {expenses.length ? "Despesas registradas" : "Grupo criado"}
                </span>
                <span>
                  Split&Go <span className="dot-separator">/</span> Cada parte
                  conta.
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal && (
        <Modal
          title={
            modal === "group"
              ? "Novo grupo"
              : modal === "member"
                ? "Adicionar participante"
                : "Nova despesa"
          }
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={submit}>
            {modal === "group" && (
              <>
                <label>
                  Nome do grupo
                  <input
                    name="name"
                    placeholder="Ex.: Fim de semana na praia"
                    required
                    maxLength={80}
                    autoFocus
                  />
                </label>
                <fieldset className="category-field">
                  <legend>Tipo de grupo</legend>
                  <div className="segmented">
                    {(
                      Object.entries(categories) as [
                        Category,
                        typeof categories.trip,
                      ][]
                    ).map(([key, value]) => {
                      const Icon = value.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={category === key}
                          onClick={() => setCategory(key)}
                          className={category === key ? "chosen" : ""}
                        >
                          <Icon size={17} /> {value.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label>
                  Moeda do grupo
                  <select name="currency" defaultValue="BRL">
                    <option value="BRL">BRL - Real brasileiro</option>
                    <option value="USD">USD - Dolar americano</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </label>
                <label>
                  Participantes
                  <textarea
                    name="members"
                    placeholder="Ana, Bruno, Carla"
                    required
                    rows={3}
                    maxLength={1800}
                  />
                </label>
              </>
            )}
            {modal === "member" && (
              <label>
                Nome do participante
                <input
                  name="name"
                  placeholder="Nome"
                  required
                  maxLength={60}
                  autoFocus
                />
              </label>
            )}
            {modal === "expense" && (
              <>
                <div className="form-context">
                  <span className="section-icon small">
                    <Receipt size={17} />
                  </span>
                  <strong>{group?.name}</strong>
                  <span>{currency}</span>
                </div>
                <label>
                  Descricao
                  <input
                    name="description"
                    placeholder="Ex.: Jantar de sexta"
                    required
                    maxLength={120}
                    autoFocus
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Valor ({expenseCurrency})
                    <input
                      name="amount"
                      value={expenseAmount}
                      onChange={(event) => {
                        setExpenseAmount(event.target.value);
                        setError("");
                      }}
                      placeholder="0,00"
                      inputMode="decimal"
                      required
                      maxLength={10}
                    />
                  </label>
                  <label>
                    Data
                    <input
                      name="date"
                      type="date"
                      defaultValue={localDate()}
                      required
                    />
                  </label>
                </div>
                <CurrencyFields
                  source={expenseCurrency}
                  target={currency}
                  rate={exchangeRate}
                  converted={convertedPreview}
                  onSource={(value) => {
                    setExpenseCurrency(value);
                    setExchangeRate("");
                    setError("");
                  }}
                  onRate={(value) => {
                    setExchangeRate(value);
                    setError("");
                  }}
                />
                <label>
                  Quem pagou?
                  <select name="payer" defaultValue={members[0]?.id} required>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <ExpenseSplit
                  members={members}
                  participants={participants}
                  mode={splitMode}
                  values={
                    splitMode === "percentage" ? percentageValues : fixedValues
                  }
                  amount={
                    convertedPreview === null
                      ? ""
                      : moneyInput(convertedPreview)
                  }
                  currency={currency}
                  onMode={(mode) => {
                    setSplitMode(mode);
                    setError("");
                  }}
                  onParticipants={(ids) => {
                    setParticipants(ids);
                    setError("");
                  }}
                  onValue={(id, value) => {
                    setError("");
                    const setter =
                      splitMode === "percentage"
                        ? setPercentageValues
                        : setFixedValues;
                    setter((current) => ({ ...current, [id]: value }));
                  }}
                />
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Check size={17} />
                )}
                {busy
                  ? "Salvando..."
                  : modal === "group"
                    ? "Criar grupo"
                    : modal === "member"
                      ? "Adicionar"
                      : "Salvar despesa"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
