"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  History,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Wallet,
  CreditCard,
  PiggyBank,
  Shield,
} from "lucide-react";

import { computeOrderFinancials, type OrderFinancials } from "@/lib/order-financials";
import {
  buildDefaultFinancialCalculatorConfig,
  type FinancialCalculatorConfig,
} from "@/lib/financial-calculator-config";

type ConfigResponse = {
  config?: FinancialCalculatorConfig;
  error?: string;
  history?: FinancialCalculatorHistory;
};

type FinancialCalculatorHistory = {
  previousConfig: FinancialCalculatorConfig | null;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByLabel: string | null;
  previousUpdatedAt: string | null;
  previousUpdatedBy: string | null;
  previousUpdatedByLabel: string | null;
};

type ScenarioInputs = {
  supplierPercentage: string;
  cardGatewayFeePercent: string;
  cashbackPercent: string;
  operationalReservePercent: string;
};

const HISTORY_FALLBACK: FinancialCalculatorHistory = {
  previousConfig: null,
  updatedAt: null,
  updatedBy: null,
  updatedByLabel: null,
  previousUpdatedAt: null,
  previousUpdatedBy: null,
  previousUpdatedByLabel: null,
};

const DEFAULT_CONFIG = buildDefaultFinancialCalculatorConfig();

function parseDecimalInput(value: string) {
  const normalized = value.replace(/,/g, ".").trim();
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function toScenarioInputs(config: FinancialCalculatorConfig): ScenarioInputs {
  return {
    supplierPercentage: String(config.supplierPercentage),
    cardGatewayFeePercent: String(config.cardGatewayFeePercent),
    cashbackPercent: String(config.cashbackPercent),
    operationalReservePercent: String(config.operationalReservePercent),
  };
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Wallet;
}) {
  return (
    <article className="min-h-[150px] rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.2)]">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-white/72">{title}</p>
          <p className="mt-2 text-[1.45rem] font-black leading-none text-white tabular-nums sm:text-[1.75rem]">{value}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/90 ring-1 ring-white/10">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-white/65">{helper}</p>
    </article>
  );
}

function PercentRow({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
      {label}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-3 text-base font-black text-white outline-none transition focus:border-cyan-400"
      />
      <span className="text-[11px] normal-case tracking-normal text-slate-500">{helper}</span>
    </label>
  );
}

export function FinancialCalculatorClient() {
  const [salesPerDayInput, setSalesPerDayInput] = useState(String(DEFAULT_CONFIG.defaultSalesPerDay));
  const [averageSaleValueInput, setAverageSaleValueInput] = useState(String(DEFAULT_CONFIG.defaultAverageTicket));
  const [activeDaysInput, setActiveDaysInput] = useState(String(DEFAULT_CONFIG.defaultActiveDays));

  const [config, setConfig] = useState<FinancialCalculatorConfig>(DEFAULT_CONFIG);
  const [scenarioInputs, setScenarioInputs] = useState<ScenarioInputs>(toScenarioInputs(DEFAULT_CONFIG));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<FinancialCalculatorHistory>(HISTORY_FALLBACK);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/financial-calculator", { cache: "no-store" });
        const payload = (await response.json()) as ConfigResponse;

        if (!response.ok || !payload.config) {
          throw new Error(payload.error ?? "Could not load calculator settings.");
        }

        if (!cancelled) {
          setConfig(payload.config);
          setScenarioInputs(toScenarioInputs(payload.config));
          setSalesPerDayInput(String(payload.config.defaultSalesPerDay));
          setAverageSaleValueInput(String(payload.config.defaultAverageTicket));
          setActiveDaysInput(String(payload.config.defaultActiveDays));
          setHistory(payload.history ?? HISTORY_FALLBACK);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load calculator settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const salesPerDay = useMemo(() => parseDecimalInput(salesPerDayInput), [salesPerDayInput]);
  const averageSaleValue = useMemo(() => parseDecimalInput(averageSaleValueInput), [averageSaleValueInput]);
  const activeDays = useMemo(() => Math.max(0, Math.round(parseDecimalInput(activeDaysInput))), [activeDaysInput]);
  const monthlyRevenueCents = useMemo(
    () => Math.round(salesPerDay * averageSaleValue * activeDays * 100),
    [activeDays, averageSaleValue, salesPerDay],
  );

  const scenario = useMemo<OrderFinancials>(() => {
    return computeOrderFinancials(
      monthlyRevenueCents,
      parseDecimalInput(scenarioInputs.supplierPercentage),
      parseDecimalInput(scenarioInputs.cardGatewayFeePercent),
      parseDecimalInput(scenarioInputs.cashbackPercent),
      parseDecimalInput(scenarioInputs.operationalReservePercent),
    );
  }, [monthlyRevenueCents, scenarioInputs]);

  const marginPercent = useMemo(
    () => (scenario.grossRevenue > 0 ? (scenario.netProfit / scenario.grossRevenue) * 100 : 0),
    [scenario.grossRevenue, scenario.netProfit],
  );

  const hasUnsavedChanges = useMemo(() => {
    return (
      parseDecimalInput(scenarioInputs.supplierPercentage) !== config.supplierPercentage ||
      parseDecimalInput(scenarioInputs.cardGatewayFeePercent) !== config.cardGatewayFeePercent ||
      parseDecimalInput(scenarioInputs.cashbackPercent) !== config.cashbackPercent ||
      parseDecimalInput(scenarioInputs.operationalReservePercent) !== config.operationalReservePercent ||
      Math.round(parseDecimalInput(salesPerDayInput)) !== config.defaultSalesPerDay ||
      Math.round(parseDecimalInput(averageSaleValueInput)) !== config.defaultAverageTicket ||
      Math.round(parseDecimalInput(activeDaysInput)) !== config.defaultActiveDays
    );
  }, [averageSaleValueInput, activeDaysInput, config, salesPerDayInput, scenarioInputs]);

  const summaryText = useMemo(() => {
    return [
      "Cenario financeiro (modelo novo):",
      `Receita bruta: ${formatUsdFromCents(scenario.grossRevenue)}`,
      `Fornecedor (${formatPercent(scenario.supplierPercentage)}): ${formatUsdFromCents(scenario.supplierPayout)}`,
      `Lucro bruto: ${formatUsdFromCents(scenario.grossProfit)}`,
      `Taxa cartao (${formatPercent(parseDecimalInput(scenarioInputs.cardGatewayFeePercent))}): ${formatUsdFromCents(scenario.cardFee)}`,
      `Cashback (${formatPercent(parseDecimalInput(scenarioInputs.cashbackPercent))}): ${formatUsdFromCents(scenario.cashback)}`,
      `Reserva operacional (${formatPercent(parseDecimalInput(scenarioInputs.operationalReservePercent))}): ${formatUsdFromCents(scenario.operationalReserve)}`,
      `Lucro liquido: ${formatUsdFromCents(scenario.netProfit)}`,
      `Margem liquida: ${formatPercent(marginPercent)}`,
    ].join("\n");
  }, [marginPercent, scenario, scenarioInputs.cardGatewayFeePercent, scenarioInputs.cashbackPercent, scenarioInputs.operationalReservePercent]);

  const canRestorePrevious = Boolean(history.previousConfig);

  const saveConfiguration = async (nextConfig: FinancialCalculatorConfig, successLabel: string) => {
    if (saving) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/financial-calculator", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
      });

      const payload = (await response.json()) as ConfigResponse;

      if (!response.ok || !payload.config) {
        throw new Error(payload.error ?? "Could not save calculator settings.");
      }

      setConfig(payload.config);
      setScenarioInputs(toScenarioInputs(payload.config));
      setSalesPerDayInput(String(payload.config.defaultSalesPerDay));
      setAverageSaleValueInput(String(payload.config.defaultAverageTicket));
      setActiveDaysInput(String(payload.config.defaultActiveDays));
      setHistory(payload.history ?? HISTORY_FALLBACK);
      setSuccessMessage(successLabel);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save calculator settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCurrent = async () => {
    const nextConfig: FinancialCalculatorConfig = {
      schemaVersion: config.schemaVersion,
      updatedAtMs: Date.now(),
      currency: "USD",
      supplierPercentage: parseDecimalInput(scenarioInputs.supplierPercentage),
      cardGatewayFeePercent: parseDecimalInput(scenarioInputs.cardGatewayFeePercent),
      cashbackPercent: parseDecimalInput(scenarioInputs.cashbackPercent),
      operationalReservePercent: parseDecimalInput(scenarioInputs.operationalReservePercent),
      defaultSalesPerDay: Math.round(parseDecimalInput(salesPerDayInput)),
      defaultAverageTicket: Math.round(parseDecimalInput(averageSaleValueInput)),
      defaultActiveDays: Math.round(parseDecimalInput(activeDaysInput)),
    };

    await saveConfiguration(nextConfig, "Configuracao financeira salva.");
  };

  const handleRestorePrevious = async () => {
    if (!history.previousConfig) return;
    await saveConfiguration(history.previousConfig, "Configuracao anterior restaurada.");
  };

  const handleRestoreDefaults = () => {
    const defaults = buildDefaultFinancialCalculatorConfig();
    setScenarioInputs(toScenarioInputs(defaults));
    setSalesPerDayInput(String(defaults.defaultSalesPerDay));
    setAverageSaleValueInput(String(defaults.defaultAverageTicket));
    setActiveDaysInput(String(defaults.defaultActiveDays));
    setSuccessMessage(null);
    setCopyMessage(null);
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyMessage("Resumo copiado.");
    } catch {
      setCopyMessage("Nao foi possivel copiar o resumo.");
    }
  };

  const currentConfigLastUpdatedLabel = history.updatedAt
    ? new Date(history.updatedAt).toLocaleString("pt-BR")
    : "Sem atualizacao registrada";

  const previousConfigLastUpdatedLabel = history.previousUpdatedAt
    ? new Date(history.previousUpdatedAt).toLocaleString("pt-BR")
    : "Sem historico anterior";

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100">
      <main className="flex w-full flex-1 flex-col px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,rgba(8,12,20,0.98),rgba(6,9,15,0.96))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Admin / Financeiro
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Calculadora Financeira</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Simule cenarios com o mesmo metodo do dashboard: fornecedor, taxa de cartao, cashback e reserva operacional.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveCurrent()}
                disabled={saving || !hasUnsavedChanges || loading}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TrendingUp className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => void handleCopySummary()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                Copiar resumo
              </button>
              <button
                type="button"
                onClick={handleRestorePrevious}
                disabled={!canRestorePrevious}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <History className="h-4 w-4" />
                Restaurar anterior
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <RefreshCcw className="h-4 w-4" />
                Padrao
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Receita Bruta"
            icon={Wallet}
            value={formatUsdFromCents(scenario.grossRevenue)}
            helper="Base do cenario mensal"
          />
          <MetricCard
            title="Repasse Fornecedor"
            icon={TrendingUp}
            value={formatUsdFromCents(scenario.supplierPayout)}
            helper={formatPercent(scenario.supplierPercentage)}
          />
          <MetricCard
            title="Lucro Bruto"
            icon={PiggyBank}
            value={formatUsdFromCents(scenario.grossProfit)}
            helper="Receita - repasse fornecedor"
          />
          <MetricCard
            title="Lucro Liquido"
            icon={Shield}
            value={formatUsdFromCents(scenario.netProfit)}
            helper={`Margem ${formatPercent(marginPercent)}`}
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Metodo Dashboard</p>
              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Percentuais do cenario</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PercentRow
                label="Fornecedor (%)"
                helper="Percentual repassado ao fornecedor"
                value={scenarioInputs.supplierPercentage}
                onChange={(next) => setScenarioInputs((current) => ({ ...current, supplierPercentage: next }))}
              />
              <PercentRow
                label="Taxa de Cartao (%)"
                helper="Custo do gateway/cartao"
                value={scenarioInputs.cardGatewayFeePercent}
                onChange={(next) => setScenarioInputs((current) => ({ ...current, cardGatewayFeePercent: next }))}
              />
              <PercentRow
                label="Cashback (%)"
                helper="Cashback aplicado sobre a receita"
                value={scenarioInputs.cashbackPercent}
                onChange={(next) => setScenarioInputs((current) => ({ ...current, cashbackPercent: next }))}
              />
              <PercentRow
                label="Reserva Operacional (%)"
                helper="Reserva para operacao"
                value={scenarioInputs.operationalReservePercent}
                onChange={(next) => setScenarioInputs((current) => ({ ...current, operationalReservePercent: next }))}
              />
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-white/10">
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">Taxa de cartao</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-300 tabular-nums">{formatUsdFromCents(scenario.cardFee)}</td>
                  </tr>
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">Cashback</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-300 tabular-nums">{formatUsdFromCents(scenario.cashback)}</td>
                  </tr>
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">Reserva operacional</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-300 tabular-nums">{formatUsdFromCents(scenario.operationalReserve)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Simulador Mensal</p>
              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Entradas do cenario</h2>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Vendas por dia
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={salesPerDayInput}
                  onChange={(event) => setSalesPerDayInput(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-3 text-base font-black text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Ticket medio (USD)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={averageSaleValueInput}
                  onChange={(event) => setAverageSaleValueInput(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-3 text-base font-black text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Dias ativos
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={activeDaysInput}
                  onChange={(event) => setActiveDaysInput(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-3 text-base font-black text-white outline-none transition focus:border-cyan-400"
                />
              </label>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              {salesPerDay.toFixed(0)} vendas/dia x {averageSaleValue.toFixed(2)} USD x {activeDays} dias
            </p>
            <p className="mt-2 text-lg font-black text-cyan-300">Receita: {formatUsdFromCents(monthlyRevenueCents)}</p>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Historico</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Ultima alteracao</h2>
              </div>
              <History className="h-5 w-5 text-slate-300" />
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Usuario</p>
                <p className="mt-1 font-semibold text-white">{history.updatedByLabel ?? history.updatedBy ?? "Sem registro"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Data</p>
                <p className="mt-1 font-semibold text-white">{currentConfigLastUpdatedLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Configuracao anterior</p>
                <p className="mt-1 font-semibold text-white">{previousConfigLastUpdatedLabel}</p>
                <p className="mt-1 text-xs text-slate-400">{history.previousUpdatedByLabel ?? history.previousUpdatedBy ?? "Sem historico anterior"}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Resumo</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Copia rapida</h2>
              </div>
              <Copy className="h-5 w-5 text-slate-300" />
            </div>

            <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-300">{summaryText}</pre>
          </article>
        </section>

        {(errorMessage || successMessage || copyMessage || loading) && (
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            {loading ? <p className="text-cyan-300">Carregando configuracoes...</p> : null}
            {errorMessage ? <p className="text-rose-300">{errorMessage}</p> : null}
            {successMessage ? <p className="text-emerald-300">{successMessage}</p> : null}
            {copyMessage ? <p className="text-sky-300">{copyMessage}</p> : null}
          </section>
        )}
      </main>
    </div>
  );
}
