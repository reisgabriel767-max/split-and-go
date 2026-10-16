"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Home,
  LoaderCircle,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  TentTree,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { Category } from "@/lib/types";
import ExpenseSplit from "@/components/expense-split";

import CurrencyFields from "@/components/currency-fields";
import { moneyInput } from "@/lib/fx";
import useWorkspace from "@/hooks/use-workspace";
import GroupPanels, { Avatar } from "@/components/group-panels";
import { MAX_GROUP_MEMBERS } from "@/lib/limits";
import DeleteGroupConfirmation from "@/components/delete-group-confirmation";

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
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
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
  const workspace = useWorkspace();
  const {
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
  } = workspace;

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
                title={g.name}
                aria-current={group?.id === g.id ? "true" : undefined}
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
                  <div className="group-heading-actions">
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
                    <button
                      type="button"
                      className="icon-button delete-group-button"
                      aria-label="Excluir grupo"
                      title="Excluir grupo"
                      disabled={busy || !!loadError}
                      onClick={() => open("delete")}
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                </div>
              </section>
              <section className="stats" aria-label="Indicadores financeiros">
                <div>
                  <span>
                    <Receipt size={16} /> Total de despesas
                  </span>
                  <strong>{money(total)}</strong>
                  <p>{expenses.length} despesas registradas</p>
                </div>
                <div className="outstanding-stat">
                  <span>
                    <ArrowLeftRight size={16} /> Saldo a acertar
                  </span>
                  <strong
                    className={outstanding ? "orange-text" : "green-text"}
                  >
                    {money(outstanding)}
                  </strong>
                  <button
                    className="summary-link"
                    onClick={() => {
                      setTab("settlement");
                      setMemberDetail(null);
                    }}
                  >
                    Ver plano de acerto <ArrowRight size={14} />
                  </button>
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
                  <p>Na moeda base {currency}</p>
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
                        tabIndex={tab === id ? 0 : -1}
                        className={tab === id ? "tab active" : "tab"}
                        onKeyDown={(event) => {
                          const keys = [
                            "ArrowLeft",
                            "ArrowRight",
                            "Home",
                            "End",
                          ];
                          if (!keys.includes(event.key)) return;
                          event.preventDefault();
                          const tabs = Array.from(
                            event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                              '[role="tab"]',
                            ),
                          );
                          const current = tabs.indexOf(event.currentTarget);
                          const next =
                            event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? tabs.length - 1
                                : (current +
                                    (event.key === "ArrowRight" ? 1 : -1) +
                                    tabs.length) %
                                  tabs.length;
                          tabs[next].focus();
                          tabs[next].click();
                        }}
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
                  disabled={
                    tab === "members" && members.length >= MAX_GROUP_MEMBERS
                  }
                  title={
                    tab === "members" && members.length >= MAX_GROUP_MEMBERS
                      ? `Limite de ${MAX_GROUP_MEMBERS} participantes atingido`
                      : undefined
                  }
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
                tabIndex={0}
              >
                <GroupPanels
                  tab={tab}
                  data={data}
                  group={group}
                  members={members}
                  expenses={expenses}
                  currency={currency}
                  balances={balances}
                  plan={plan}
                  memberDetail={memberDetail}
                  setMemberDetail={setMemberDetail}
                  outstanding={outstanding}
                  open={open}
                  money={money}
                  memberName={memberName}
                />
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
                : modal === "delete"
                  ? "Excluir grupo"
                  : "Nova despesa"
          }
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={submit} aria-busy={busy}>
            <fieldset className="form-fields" disabled={busy}>
              {modal === "delete" && deleteTarget && (
                <DeleteGroupConfirmation
                  group={deleteTarget}
                  value={deleteConfirmation}
                  onChange={(value) => {
                    setDeleteConfirmation(value);
                    setError("");
                  }}
                />
              )}
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
                    Participantes (ate {MAX_GROUP_MEMBERS})
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
                    <label className="amount-field">
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
                      splitMode === "percentage"
                        ? percentageValues
                        : fixedValues
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
            </fieldset>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                className={
                  modal === "delete" ? "button danger" : "button primary"
                }
                disabled={
                  busy ||
                  (modal === "delete" &&
                    (!deleteTarget || deleteConfirmation !== deleteTarget.name))
                }
              >
                {busy ? (
                  <LoaderCircle size={17} className="spin" />
                ) : modal === "delete" ? (
                  <Trash2 size={17} />
                ) : (
                  <Check size={17} />
                )}
                {busy
                  ? modal === "delete"
                    ? "Excluindo..."
                    : "Salvando..."
                  : modal === "group"
                    ? "Criar grupo"
                    : modal === "member"
                      ? "Adicionar"
                      : modal === "delete"
                        ? "Excluir grupo"
                        : "Salvar despesa"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
