"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Sparkles,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { CommissionDonut } from "@/app/components/painel-agente/commission-donut";
import { CommissionLineChart, type CommissionChartPoint } from "@/app/components/painel-agente/commission-line-chart";
import { useProfileSession } from "@/app/profile/use-profile-session";

const ROWS_PER_PAGE = 10;

type AgentPanelClientRow = {
  uid: string;
  username: string;
  email: string;
  lastAccessAt: string | null;
  lastPurchaseAt: string | null;
  transactionCount: number;
  totalSalesCentsByCurrency: Record<string, number>;
  totalPlatformFeeCentsByCurrency: Record<string, number>;
  totalAgentPayoutCentsByCurrency: Record<string, number>;
};

type AgentPanelTransactionRow = {
  id: string;
  orderId: string;
  customerUid: string | null;
  customerLabel: string;
  customerEmail: string;
  amountTotalCents: number;
  platformFeeCents: number;
  agentPayoutCents: number;
  currency: string;
  status: string;
  createdAt: string | null;
};

type AgentPanelPayload = {
  clients: AgentPanelClientRow[];
  transactions: AgentPanelTransactionRow[];
  totals: {
    salesByCurrency: Record<string, number>;
    platformFeeByCurrency: Record<string, number>;
    agentPayoutByCurrency: Record<string, number>;
    transactionCount: number;
    clientsCount: number;
  };
};

function formatMoney(cents: number, currency: string) {
  const normalized = currency.toUpperCase();
  const locale = normalized === "BRL" ? "pt-BR" : normalized === "EUR" ? "de-DE" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalized,
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("pt-BR");
}

function formatCurrencyBreakdown(values: Record<string, number>) {
  const entries = Object.entries(values).filter(([, cents]) => cents > 0);
  if (entries.length === 0) {
    return "--";
  }

  return entries.map(([currency, cents]) => `${formatMoney(cents, currency)} (${currency})`).join(" | ");
}

/** Fee-transfer statuses meaning the order was closed and the commission is finalized/withdrawable. */
function isCommissionFinalized(status: string) {
  return status === "processed" || status === "paid";
}

function pickPrimaryCurrency(byCurrency: Record<string, number>): string {
  if (typeof byCurrency.USD === "number") {
    return "USD";
  }

  const entries = Object.entries(byCurrency);
  if (entries.length === 0) {
    return "USD";
  }

  return entries.sort((left, right) => right[1] - left[1])[0]![0];
}

function OrderIdBadge({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore.
    }
  };

  return (
    <div className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1" title={orderId}>
      <span className="truncate font-mono text-[0.68rem] text-[#9bb8d8]">{orderId}</span>
      <button
        type="button"
        onClick={() => void copy()}
        title="Copy order ID"
        className="shrink-0 rounded-md p-0.5 text-[#6f89a8] transition hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (isCommissionFinalized(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        processed
      </span>
    );
  }

  if (status === "failed" || status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300">
        <XCircle className="h-3.5 w-3.5" />
        {status.replace(/_/g, " ")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
      <Clock className="h-3.5 w-3.5" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function PainelAgentePage() {
  const { status, profile, user } = useProfileSession();
  const [loadingPanel, setLoadingPanel] = useState(true);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<AgentPanelPayload | null>(null);
  const [clientsPage, setClientsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [chartPeriod, setChartPeriod] = useState<"month" | "all">("month");

  useEffect(() => {
    let cancelled = false;

    const loadPanel = async () => {
      if (status !== "authenticated" || !profile || profile.isAgent !== true || !user) {
        setPanelData(null);
        setPanelError(null);
        setLoadingPanel(false);
        return;
      }

      setLoadingPanel(true);
      setPanelError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/agent/panel", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json()) as AgentPanelPayload & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load the agent panel.");
        }

        if (!cancelled) {
          setPanelData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setPanelError(error instanceof Error ? error.message : "Could not load the agent panel.");
          setPanelData(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingPanel(false);
        }
      }
    };

    void loadPanel();

    return () => {
      cancelled = true;
    };
  }, [profile, status, user]);

  const primaryCurrency = useMemo(
    () => pickPrimaryCurrency(panelData?.totals.agentPayoutByCurrency ?? {}),
    [panelData],
  );

  const commissionStats = useMemo(() => {
    const transactions = panelData?.transactions ?? [];
    const earnedCents = panelData?.totals.agentPayoutByCurrency[primaryCurrency] ?? 0;

    let pendingCents = 0;
    for (const transaction of transactions) {
      if (transaction.currency !== primaryCurrency) continue;
      if (!isCommissionFinalized(transaction.status)) {
        pendingCents += transaction.agentPayoutCents;
      }
    }

    const availableCents = Math.max(0, earnedCents - pendingCents);
    const pct = (value: number) => (earnedCents > 0 ? (value / earnedCents) * 100 : 0);

    return {
      currency: primaryCurrency,
      earnedCents,
      pendingCents,
      availableCents,
      earnedPct: earnedCents > 0 ? 100 : 0,
      pendingPct: pct(pendingCents),
      availablePct: pct(availableCents),
    };
  }, [panelData, primaryCurrency]);

  const chartPoints = useMemo<CommissionChartPoint[]>(() => {
    const transactions = (panelData?.transactions ?? []).filter((row) => row.currency === primaryCurrency && row.createdAt);
    const now = new Date();
    const cutoffMs =
      chartPeriod === "month" ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : -Infinity;

    const byDay = new Map<string, { dateMs: number; cents: number }>();

    for (const transaction of transactions) {
      const createdAt = new Date(transaction.createdAt!);
      if (Number.isNaN(createdAt.getTime()) || createdAt.getTime() < cutoffMs) continue;

      const dayKey = createdAt.toISOString().slice(0, 10);
      const dayStartMs = new Date(dayKey).getTime();
      const existing = byDay.get(dayKey);
      if (existing) {
        existing.cents += transaction.agentPayoutCents;
      } else {
        byDay.set(dayKey, { dateMs: dayStartMs, cents: transaction.agentPayoutCents });
      }
    }

    return Array.from(byDay.values())
      .sort((left, right) => left.dateMs - right.dateMs)
      .map((entry) => ({
        dateMs: entry.dateMs,
        cents: entry.cents,
        label: new Date(entry.dateMs).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
      }));
  }, [panelData, primaryCurrency, chartPeriod]);

  const thisMonthVsPrevious = useMemo(() => {
    const transactions = (panelData?.transactions ?? []).filter((row) => row.currency === primaryCurrency && row.createdAt);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    let thisMonthCents = 0;
    let previousMonthCents = 0;

    for (const transaction of transactions) {
      const createdAtMs = new Date(transaction.createdAt!).getTime();
      if (createdAtMs >= monthStart) {
        thisMonthCents += transaction.agentPayoutCents;
      } else if (createdAtMs >= previousMonthStart) {
        previousMonthCents += transaction.agentPayoutCents;
      }
    }

    const changePct = previousMonthCents > 0 ? ((thisMonthCents - previousMonthCents) / previousMonthCents) * 100 : null;

    return { thisMonthCents, changePct };
  }, [panelData, primaryCurrency]);

  const clients = panelData?.clients ?? [];
  const transactions = panelData?.transactions ?? [];
  const clientsTotalPages = Math.max(1, Math.ceil(clients.length / ROWS_PER_PAGE));
  const transactionsTotalPages = Math.max(1, Math.ceil(transactions.length / ROWS_PER_PAGE));
  const pagedClients = clients.slice((clientsPage - 1) * ROWS_PER_PAGE, clientsPage * ROWS_PER_PAGE);
  const pagedTransactions = transactions.slice((transactionsPage - 1) * ROWS_PER_PAGE, transactionsPage * ROWS_PER_PAGE);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0f16] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm text-slate-400">Loading agent panel...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0f16] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold text-amber-200">Sign in to access the agent panel.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/20"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (profile.isAgent !== true) {
    return (
      <div className="min-h-screen bg-[#0a0f16] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <p className="text-sm font-semibold text-rose-200">Your user does not have agent permission for this panel.</p>
          <Link
            href="/profile"
            className="mt-3 inline-flex rounded-lg border border-rose-300/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/20"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f16] px-4 pb-16 pt-28 text-slate-100 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        {panelError ? (
          <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
            <p className="text-sm font-semibold text-rose-200">{panelError}</p>
          </section>
        ) : null}

        {/* Hero + Commission Overview */}
        <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-cyan-400/15 bg-[#0b131d] p-6 sm:p-7">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]">
              <Image src="/chest.png" alt="" fill sizes="480px" className="object-contain object-right" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b131d] via-[#0b131d]/60 to-transparent" />

            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Agent Panel</p>
              <h1 className="mt-2 inline-flex items-center gap-2 text-3xl font-black text-white sm:text-4xl">
                Welcome, {profile.username}
                <Sparkles className="h-5 w-5 text-[#f2c879]" />
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                Track linked clients and your commission for each commission-eligible order.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
                    <Users className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-xl font-black text-white">{panelData?.totals.clientsCount ?? 0}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-400">Linked Clients</p>
                  </div>
                </div>

                <span className="hidden h-10 w-px bg-white/10 sm:block" />

                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/10 text-amber-300">
                    <ArrowLeftRight className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-xl font-black text-white">{panelData?.totals.transactionCount ?? 0}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-400">Commission Transactions</p>
                  </div>
                </div>

                <span className="hidden h-10 w-px bg-white/10 sm:block" />

                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300">
                    <Coins className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-xl font-black text-white">{formatMoney(commissionStats.earnedCents, commissionStats.currency)}</p>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Total Commission ({commissionStats.currency})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white">Commission Overview</p>
              <select className="rounded-lg border border-white/12 bg-black/25 px-2 py-1 text-[0.66rem] font-semibold text-[#c7daef] outline-none focus:border-cyan-400/50">
                <option>This Month</option>
              </select>
            </div>

            <div className="mt-6">
              <CommissionDonut
                totalLabel={formatMoney(commissionStats.earnedCents, commissionStats.currency)}
                earned={{ cents: commissionStats.earnedCents, label: formatMoney(commissionStats.earnedCents, commissionStats.currency), pct: commissionStats.earnedPct }}
                pending={{ cents: commissionStats.pendingCents, label: formatMoney(commissionStats.pendingCents, commissionStats.currency), pct: commissionStats.pendingPct }}
                available={{ cents: commissionStats.availableCents, label: formatMoney(commissionStats.availableCents, commissionStats.currency), pct: commissionStats.availablePct }}
              />
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl border border-white/10 bg-[#0b131d] p-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
              <Users className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">Linked Clients</p>
            <p className="mt-1 text-2xl font-black text-white">{panelData?.totals.clientsCount ?? 0}</p>
            <p className="text-[0.65rem] font-medium text-slate-500">Total linked clients</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0b131d] p-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-500/10 text-amber-300">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">Commission Transactions</p>
            <p className="mt-1 text-2xl font-black text-white">{panelData?.totals.transactionCount ?? 0}</p>
            <p className="text-[0.65rem] font-medium text-slate-500">All time transactions</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0b131d] p-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300">
              <Coins className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">Commission Earned</p>
            <p className="mt-1 text-2xl font-black text-cyan-300">{formatMoney(commissionStats.earnedCents, commissionStats.currency)}</p>
            <p className="text-[0.65rem] font-medium text-slate-500">Total earned ({commissionStats.currency})</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0b131d] p-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/10 text-sky-300">
              <Clock className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">Pending Commission</p>
            <p className="mt-1 text-2xl font-black text-white">{formatMoney(commissionStats.pendingCents, commissionStats.currency)}</p>
            <p className="text-[0.65rem] font-medium text-slate-500">Awaiting approval</p>
          </article>

          <article className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-[#0b131d] p-4 sm:col-span-2 xl:col-span-1">
            <div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                <Wallet className="h-4 w-4" />
              </span>
              <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">Available Balance</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">{formatMoney(commissionStats.availableCents, commissionStats.currency)}</p>
              <p className="text-[0.65rem] font-medium text-slate-500">Ready to withdraw</p>
            </div>
            <Link
              href="/profile/withdraw"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#f2c879]/50 px-3 py-2 text-xs font-bold text-[#f2c879] transition hover:bg-[#f2c879]/10"
            >
              <Wallet className="h-3.5 w-3.5" />
              Withdraw
            </Link>
          </article>
        </section>

        {/* Linked clients + commission over time */}
        <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-300" />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white">Linked Clients</p>
              {loadingPanel ? <span className="ml-auto text-xs text-slate-500">Refreshing...</span> : null}
            </div>

            {loadingPanel ? (
              <p className="mt-4 text-sm text-slate-400">Loading clients...</p>
            ) : clients.length > 0 ? (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-[0.6rem] font-black uppercase tracking-[0.12em] text-slate-500">
                        <th className="py-2 pr-3">Client</th>
                        <th className="px-3 py-2">Last Access</th>
                        <th className="px-3 py-2">Last Transaction</th>
                        <th className="px-3 py-2">Total Spent</th>
                        <th className="px-3 py-2">Commission Earned</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedClients.map((clientRow) => {
                        const isActive = clientRow.transactionCount > 0;
                        const totalSpentEntry = Object.entries(clientRow.totalSalesCentsByCurrency).find(([, cents]) => cents > 0);

                        return (
                          <tr key={clientRow.uid} className="border-b border-white/6">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-black text-cyan-300">
                                  {clientRow.username.charAt(0).toUpperCase() || "?"}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-100">{clientRow.username}</p>
                                  <p className="truncate text-xs text-slate-500">{clientRow.email || clientRow.uid}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-300">{formatDateTime(clientRow.lastAccessAt)}</td>
                            <td className="px-3 py-3 text-xs text-slate-300">{formatDateTime(clientRow.lastPurchaseAt)}</td>
                            <td className="px-3 py-3 text-xs text-slate-300">
                              <p className="font-semibold text-slate-100">
                                {totalSpentEntry ? formatMoney(totalSpentEntry[1], totalSpentEntry[0]) : "$0.00"}
                              </p>
                              <p className="text-[0.65rem] text-slate-500">{clientRow.transactionCount} orders</p>
                            </td>
                            <td className="px-3 py-3 text-xs font-bold text-cyan-300">
                              {formatCurrencyBreakdown(clientRow.totalAgentPayoutCentsByCurrency)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] ${
                                  isActive
                                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                                    : "border-sky-400/40 bg-sky-500/10 text-sky-300"
                                }`}
                              >
                                {isActive ? "Active" : "Invited"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Showing {(clientsPage - 1) * ROWS_PER_PAGE + 1} to {Math.min(clientsPage * ROWS_PER_PAGE, clients.length)} of{" "}
                    {clients.length} clients
                  </p>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setClientsPage((current) => Math.max(1, current - 1))}
                      disabled={clientsPage <= 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#f2c879]/60 bg-[#f2c879]/10 px-2 text-xs font-bold text-[#f2c879]">
                      {clientsPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setClientsPage((current) => Math.min(clientsTotalPages, current + 1))}
                      disabled={clientsPage >= clientsTotalPages}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No linked clients found.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white">Commission Over Time</p>
              <select
                value={chartPeriod}
                onChange={(event) => setChartPeriod(event.target.value as "month" | "all")}
                className="rounded-lg border border-white/12 bg-black/25 px-2 py-1 text-[0.62rem] font-semibold text-[#c7daef] outline-none focus:border-cyan-400/50"
              >
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div className="mt-4">
              <CommissionLineChart points={chartPoints} formatValue={(cents) => formatMoney(cents, commissionStats.currency)} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-slate-500">Total Earned</p>
                <p className="mt-1 text-lg font-black text-cyan-300">{formatMoney(commissionStats.earnedCents, commissionStats.currency)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-slate-500">This Month</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-black text-cyan-300">
                  {formatMoney(thisMonthVsPrevious.thisMonthCents, commissionStats.currency)}
                  {thisMonthVsPrevious.changePct !== null ? (
                    <span className={`text-[0.6rem] font-bold ${thisMonthVsPrevious.changePct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {thisMonthVsPrevious.changePct >= 0 ? "↑" : "↓"} {Math.abs(thisMonthVsPrevious.changePct).toFixed(1)}%
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Commission history by client */}
        <section className="rounded-[1.5rem] border border-white/10 bg-[#0b131d] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-300" />
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-white">Commission History by Client</p>
          </div>

          {loadingPanel ? (
            <p className="mt-4 text-sm text-slate-400">Loading transactions...</p>
          ) : transactions.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-[0.6rem] font-black uppercase tracking-[0.12em] text-slate-500">
                      <th className="py-2 pr-3">Order ID</th>
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Commission</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTransactions.map((row) => (
                      <tr key={row.id} className="border-b border-white/6">
                        <td className="py-3 pr-3">
                          <OrderIdBadge orderId={row.orderId} />
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-300">{row.customerLabel}</td>
                        <td className="px-3 py-3 text-xs font-bold text-cyan-300">{formatMoney(row.agentPayoutCents, row.currency)}</td>
                        <td className="px-3 py-3">
                          <StatusPill status={row.status} />
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400">{formatDateTime(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  Showing {(transactionsPage - 1) * ROWS_PER_PAGE + 1} to {Math.min(transactionsPage * ROWS_PER_PAGE, transactions.length)}{" "}
                  of {transactions.length} transactions
                </p>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTransactionsPage((current) => Math.max(1, current - 1))}
                    disabled={transactionsPage <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#f2c879]/60 bg-[#f2c879]/10 px-2 text-xs font-bold text-[#f2c879]">
                    {transactionsPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransactionsPage((current) => Math.min(transactionsTotalPages, current + 1))}
                    disabled={transactionsPage >= transactionsTotalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No commission transactions found.</p>
          )}
        </section>
      </main>
    </div>
  );
}
