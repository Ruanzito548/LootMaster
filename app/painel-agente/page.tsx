"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";

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

  return entries
    .map(([currency, cents]) => `${formatMoney(cents, currency)} (${currency})`)
    .join(" | ");
}

export default function PainelAgentePage() {
  const { status, profile, user } = useProfileSession();
  const [loadingPanel, setLoadingPanel] = useState(true);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<AgentPanelPayload | null>(null);

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
          throw new Error(payload.error ?? "Nao foi possivel carregar o painel do agente.");
        }

        if (!cancelled) {
          setPanelData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setPanelError(error instanceof Error ? error.message : "Nao foi possivel carregar o painel do agente.");
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

  const agentPayoutLabel = useMemo(
    () => formatCurrencyBreakdown(panelData?.totals.agentPayoutByCurrency ?? {}),
    [panelData],
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm text-slate-400">Carregando painel do agente...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !profile) {
    return (
      <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold text-amber-200">Faca login para acessar o painel do agente.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-lg border border-amber-300/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/20"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  if (profile.isAgent !== true) {
    return (
      <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <p className="text-sm font-semibold text-rose-200">Seu usuario nao possui permissao de agente para este painel.</p>
          <Link
            href="/profile"
            className="mt-3 inline-flex rounded-lg border border-rose-300/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/20"
          >
            Voltar ao perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] px-4 pb-10 pt-28 text-slate-100 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-6xl">
        <header className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Painel do Agente</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Bem-vindo, {profile.username}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Aqui voce acompanha clientes vinculados e sua comissao por cada pedido comissionavel.
          </p>
        </header>

        {panelError ? (
          <section className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
            <p className="text-sm font-semibold text-rose-200">{panelError}</p>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Clientes vinculados</p>
            <p className="mt-2 text-2xl font-black text-cyan-300">{panelData?.totals.clientsCount ?? 0}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Transacoes de taxa</p>
            <p className="mt-2 text-2xl font-black text-amber-300">{panelData?.totals.transactionCount ?? 0}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Sua comissao estimada</p>
            <p className="mt-2 text-sm font-black text-fuchsia-300">{agentPayoutLabel}</p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Clientes vinculados</p>
            {loadingPanel ? <span className="text-xs text-slate-500">Atualizando...</span> : null}
          </div>

          {loadingPanel ? (
            <p className="mt-3 text-sm text-slate-400">Carregando clientes...</p>
          ) : panelData && panelData.clients.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Ultimo acesso</th>
                    <th className="px-3 py-2">Ultima transacao</th>
                    <th className="px-3 py-2">Comissao agente</th>
                  </tr>
                </thead>
                <tbody>
                  {panelData.clients.map((clientRow) => (
                    <tr key={clientRow.uid} className="border-b border-white/5">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-100">{clientRow.username}</p>
                        <p className="text-xs text-slate-400">{clientRow.email || clientRow.uid}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-300">{formatDateTime(clientRow.lastAccessAt)}</td>
                      <td className="px-3 py-2 text-xs text-slate-300">{formatDateTime(clientRow.lastPurchaseAt)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-cyan-300">
                        {formatCurrencyBreakdown(clientRow.totalAgentPayoutCentsByCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Nenhum cliente vinculado encontrado.</p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Historico de comissoes por cliente</p>

          {loadingPanel ? (
            <p className="mt-3 text-sm text-slate-400">Carregando transacoes...</p>
          ) : panelData && panelData.transactions.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Comissao</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {panelData.transactions.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-2 text-xs font-semibold text-slate-100">{row.orderId}</td>
                      <td className="px-3 py-2 text-xs text-slate-300">{row.customerLabel}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-cyan-300">{formatMoney(row.agentPayoutCents, row.currency)}</td>
                      <td className="px-3 py-2 text-xs text-amber-300">{row.status.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{formatDateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Nenhuma transacao de taxa encontrada.</p>
          )}
        </section>
      </main>
    </div>
  );
}
