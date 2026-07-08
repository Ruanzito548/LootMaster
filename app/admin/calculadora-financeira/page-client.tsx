"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  buildDefaultFinancialCalculatorConfig,
  type FinancialCalculatorConfig,
  type FinancialDistributionCategory,
  type FinancialDistributionCategoryKey,
} from "@/lib/financial-calculator-config";

type ConfigResponse = {
  config?: FinancialCalculatorConfig;
  error?: string;
};

type CategoryVisual = {
  icon: string;
  cardClassName: string;
  badgeClassName: string;
  barClassName: string;
  textClassName: string;
};

type LiveCategory = FinancialDistributionCategory & {
  visual: CategoryVisual;
};

type DistributionCalculation = {
  totalPercent: number;
  isInvalid: boolean;
  allocations: Array<LiveCategory & { amount: number }>;
  remainingValue: number | null;
  remainingPercent: number | null;
};

const DEFAULT_CONFIG = buildDefaultFinancialCalculatorConfig();
const DEFAULT_PAGE_FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const CATEGORY_VISUALS: Record<FinancialDistributionCategoryKey, CategoryVisual> = {
  profitMargin: {
    icon: "📈",
    cardClassName: "border-emerald-500/40 bg-emerald-950/20",
    badgeClassName: "bg-emerald-500/15 text-emerald-300",
    barClassName: "bg-[linear-gradient(90deg,#22c55e,#86efac)]",
    textClassName: "text-emerald-300",
  },
  retentionFund: {
    icon: "🎁",
    cardClassName: "border-sky-500/40 bg-sky-950/20",
    badgeClassName: "bg-sky-500/15 text-sky-300",
    barClassName: "bg-[linear-gradient(90deg,#0ea5e9,#7dd3fc)]",
    textClassName: "text-sky-300",
  },
  platformFee: {
    icon: "🏦",
    cardClassName: "border-fuchsia-500/40 bg-fuchsia-950/20",
    badgeClassName: "bg-fuchsia-500/15 text-fuchsia-300",
    barClassName: "bg-[linear-gradient(90deg,#a855f7,#d8b4fe)]",
    textClassName: "text-fuchsia-300",
  },
  otherCosts: {
    icon: "📦",
    cardClassName: "border-orange-500/40 bg-orange-950/20",
    badgeClassName: "bg-orange-500/15 text-orange-300",
    barClassName: "bg-[linear-gradient(90deg,#f97316,#fdba74)]",
    textClassName: "text-orange-300",
  },
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  const normalized = Number(value.toFixed(2));
  return `${normalized % 1 === 0 ? normalized.toFixed(0) : normalized.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}%`;
}

function parseDecimalInput(value: string) {
  const normalized = value.replace(/,/g, ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function toPercentInputMap(categories: FinancialDistributionCategory[]) {
  return categories.reduce<Record<FinancialDistributionCategoryKey, string>>((acc, category) => {
    acc[category.key] = String(category.percent);
    return acc;
  }, {
    profitMargin: "0",
    retentionFund: "0",
    platformFee: "0",
    otherCosts: "0",
  });
}

function summarizeConfig(config: FinancialCalculatorConfig) {
  return config.categories.map((category) => ({
    ...category,
    visual: CATEGORY_VISUALS[category.key],
  }));
}

function buildDistributionCalculation(categories: LiveCategory[], totalSales: number): DistributionCalculation {
  const totalPercent = categories.reduce((sum, category) => sum + category.percent, 0);
  const totalPercentRounded = Number(totalPercent.toFixed(2));
  const isInvalid = totalPercentRounded > 100;

  const allocations = categories.map((category) => ({
    ...category,
    amount: totalSales * (category.percent / 100),
  }));

  const allocatedTotal = allocations.reduce((sum, category) => sum + category.amount, 0);

  return {
    totalPercent: totalPercentRounded,
    isInvalid,
    allocations,
    remainingValue: isInvalid ? null : Math.max(totalSales - allocatedTotal, 0),
    remainingPercent: isInvalid ? null : Math.max(100 - totalPercentRounded, 0),
  };
}

type ResultCardProps = {
  label: string;
  icon: string;
  value: string;
  helper: string;
  className: string;
  valueClassName: string;
  valueSizeClassName?: string;
  helperClassName?: string;
};

function ResultCard({
  label,
  icon,
  value,
  helper,
  className,
  valueClassName,
  valueSizeClassName = "text-3xl",
  helperClassName = "text-xs",
}: ResultCardProps) {
  return (
    <article className={`rounded-[1.5rem] border p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">{label}</p>
          <p className={`mt-3 break-words font-black leading-none ${valueSizeClassName} ${valueClassName}`}>{value}</p>
        </div>
        <span className="shrink-0 text-2xl">{icon}</span>
      </div>
      <p className={`mt-3 font-semibold uppercase tracking-[0.12em] text-green-700 ${helperClassName}`}>{helper}</p>
    </article>
  );
}

export function FinancialCalculatorClient() {
  const [salesInput, setSalesInput] = useState("10000");
  const [salesPerDayInput, setSalesPerDayInput] = useState("12");
  const [averageSaleValueInput, setAverageSaleValueInput] = useState("100");
  const [activeDaysInput, setActiveDaysInput] = useState("30");
  const [config, setConfig] = useState<FinancialCalculatorConfig>(DEFAULT_CONFIG);
  const [percentInputs, setPercentInputs] = useState<Record<FinancialDistributionCategoryKey, string>>(
    toPercentInputMap(DEFAULT_CONFIG.categories),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/admin/financial-calculator", {
          cache: "no-store",
        });
        const payload = (await response.json()) as ConfigResponse;

        if (!response.ok || !payload.config) {
          throw new Error(payload.error ?? "Could not load calculator settings.");
        }

        if (!cancelled) {
          setConfig(payload.config);
          setPercentInputs(toPercentInputMap(payload.config.categories));
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

  const categories = useMemo(
    () =>
      config.categories.map((category) => ({
        ...category,
        percent: parseDecimalInput(percentInputs[category.key] ?? String(category.percent)),
        visual: CATEGORY_VISUALS[category.key],
      })),
    [config.categories, percentInputs],
  );

  const totalSales = useMemo(() => parseDecimalInput(salesInput), [salesInput]);

  const calculation = useMemo(() => {
    return buildDistributionCalculation(categories, totalSales);
  }, [categories, totalSales]);

  const salesPerDay = useMemo(() => parseDecimalInput(salesPerDayInput), [salesPerDayInput]);
  const averageSaleValue = useMemo(() => parseDecimalInput(averageSaleValueInput), [averageSaleValueInput]);
  const activeDays = useMemo(() => Math.max(0, Math.round(parseDecimalInput(activeDaysInput))), [activeDaysInput]);
  const estimatedMonthlyRevenue = useMemo(() => salesPerDay * averageSaleValue * activeDays, [activeDays, averageSaleValue, salesPerDay]);

  const monthlySimulation = useMemo(
    () => buildDistributionCalculation(categories, estimatedMonthlyRevenue),
    [categories, estimatedMonthlyRevenue],
  );

  const monthlyProfit = useMemo(
    () => monthlySimulation.allocations.find((category) => category.key === "profitMargin")?.amount ?? 0,
    [monthlySimulation.allocations],
  );

  const defaultPercentInputs = useMemo(() => toPercentInputMap(DEFAULT_CONFIG.categories), []);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(percentInputs) !== JSON.stringify(toPercentInputMap(config.categories)),
    [config.categories, percentInputs],
  );

  const summaryText = useMemo(() => {
    const lines = [`Total em vendas: ${formatUsd(totalSales)}`, ""];

    for (const category of calculation.allocations) {
      lines.push(`${category.shortLabel} (${formatPercent(category.percent)}): ${formatUsd(category.amount)}`);
    }

    lines.push("");
    lines.push(
      calculation.isInvalid || calculation.remainingValue === null || calculation.remainingPercent === null
        ? "Repasse para fornecedores: configuracao invalida"
        : `Repasse para fornecedores (${formatPercent(calculation.remainingPercent)}): ${formatUsd(calculation.remainingValue)}`,
    );

    return lines.join("\n");
  }, [calculation.allocations, calculation.isInvalid, calculation.remainingPercent, calculation.remainingValue, totalSales]);

  const handlePercentChange = (key: FinancialDistributionCategoryKey, value: string) => {
    setPercentInputs((current) => ({ ...current, [key]: value }));
    setSuccessMessage(null);
  };

  const handleClear = () => {
    setSalesInput("");
    setSalesPerDayInput("");
    setAverageSaleValueInput("");
    setActiveDaysInput("");
    setPercentInputs({
      profitMargin: "0",
      retentionFund: "0",
      platformFee: "0",
      otherCosts: "0",
    });
    setSuccessMessage(null);
    setCopyMessage(null);
  };

  const handleRestoreDefaults = () => {
    setPercentInputs(defaultPercentInputs);
    setSuccessMessage(null);
    setCopyMessage(null);
  };

  const handleSave = async () => {
    if (saving || calculation.isInvalid) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextConfig: FinancialCalculatorConfig = {
        ...config,
        updatedAtMs: Date.now(),
        currency: "USD",
        categories: categories.map((category) => ({
          key: category.key,
          label: category.label,
          shortLabel: category.shortLabel,
          percent: Number(category.percent.toFixed(2)),
        })),
      };

      const response = await fetch("/api/admin/financial-calculator", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ config: nextConfig }),
      });

      const payload = (await response.json()) as ConfigResponse;

      if (!response.ok || !payload.config) {
        throw new Error(payload.error ?? "Could not save calculator settings.");
      }

      setConfig(payload.config);
      setPercentInputs(toPercentInputMap(payload.config.categories));
      setSuccessMessage("Percentuais salvos nas configuracoes do sistema.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save calculator settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopySummary = async () => {
    if (calculation.isInvalid) {
      return;
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyMessage("Resumo copiado.");
    } catch {
      setCopyMessage("Nao foi possivel copiar o resumo.");
    }
  };

  const distributionSegments = useMemo(
    () => [
      ...calculation.allocations.map((category) => ({
        key: category.key,
        label: category.shortLabel,
        percent: category.percent,
        className: category.visual.barClassName,
      })),
      {
        key: "remaining",
        label: "Repasse fornecedores",
        percent: calculation.isInvalid || calculation.remainingPercent === null ? 0 : calculation.remainingPercent,
        className: "bg-[linear-gradient(90deg,#4b5563,#9ca3af)]",
      },
    ],
    [calculation.allocations, calculation.isInvalid, calculation.remainingPercent],
  );

  return (
    <div className="min-h-screen bg-black text-green-300" style={{ fontFamily: DEFAULT_PAGE_FONT_FAMILY }}>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Admin / Financeiro</p>
            <h1 className="text-4xl font-black leading-tight text-green-200 sm:text-5xl">Calculadora Financeira</h1>
            <p className="text-sm leading-7 text-green-600 sm:text-base">
              Simule a distribuicao do faturamento em tempo real, ajuste percentuais persistidos no sistema e acompanhe
              o repasse para fornecedores antes de aplicar a configuracao no painel.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || calculation.isInvalid || !hasUnsavedChanges || loading}
              className="rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Salvando..." : "Salvar configuracoes"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
            >
              Restaurar valores padrao
            </button>
            <button
              type="button"
              onClick={() => void handleCopySummary()}
              disabled={calculation.isInvalid}
              className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copiar resumo
            </button>
            <Link
              href="/admin"
              className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
            >
              Back to admin
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <article className="rounded-[1.8rem] border border-green-900 bg-green-950/20 p-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <label className="space-y-2 text-xs font-bold uppercase tracking-[0.15em] text-green-600">
                Valor Total em Vendas
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={salesInput}
                  onChange={(event) => setSalesInput(event.target.value)}
                  placeholder="10000"
                  className="block w-full rounded-2xl border border-green-800 bg-black px-4 py-4 text-2xl font-black text-green-200 outline-none transition focus:border-green-600"
                />
                <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-green-700">
                  Visualizacao USD: {formatUsd(totalSales)}
                </span>
              </label>

              <div className="rounded-[1.5rem] border border-green-900 bg-black/30 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Resumo rapido</p>
                <p className="mt-3 text-4xl font-black text-green-200">{formatPercent(calculation.totalPercent)}</p>
                <p className="mt-2 text-sm font-semibold text-green-500">Total dos percentuais: {formatPercent(calculation.totalPercent)}</p>
                <p className="mt-2 text-sm text-green-600">Total dos percentuais configurados em tempo real.</p>
                <div className="mt-4 h-2 rounded-full bg-green-950">
                  <div
                    className={`h-2 rounded-full ${calculation.isInvalid ? "bg-[linear-gradient(90deg,#ef4444,#fca5a5)]" : "bg-[linear-gradient(90deg,#22c55e,#86efac)]"}`}
                    style={{ width: `${Math.min(calculation.totalPercent, 100)}%` }}
                  />
                </div>
                <p className={`mt-3 text-sm font-semibold ${calculation.isInvalid ? "text-rose-400" : "text-emerald-400"}`}>
                  {calculation.isInvalid
                    ? "A soma dos percentuais nao pode ultrapassar 100%."
                    : "Configuracao valida para simular e salvar."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => {
                const isInvalid = calculation.isInvalid;
                return (
                  <label
                    key={category.key}
                    className={`rounded-[1.5rem] border p-4 text-xs font-bold uppercase tracking-[0.14em] ${isInvalid ? "border-rose-500/60 bg-rose-950/10 text-rose-300" : "border-green-900 bg-black/30 text-green-600"}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>{category.label}</span>
                      <span className="text-lg">{category.visual.icon}</span>
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                      value={percentInputs[category.key] ?? "0"}
                      onChange={(event) => handlePercentChange(category.key, event.target.value)}
                      className={`mt-3 block w-full rounded-xl border px-3 py-3 text-lg font-black outline-none transition ${isInvalid ? "border-rose-500/60 bg-rose-950/20 text-rose-100 focus:border-rose-400" : "border-green-800 bg-black text-green-200 focus:border-green-600"}`}
                    />
                    <span className={`mt-2 block ${isInvalid ? "text-rose-300/80" : "text-green-700"}`}>
                      {category.shortLabel}: {formatPercent(category.percent)}
                    </span>
                  </label>
                );
              })}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-green-900 bg-green-950/20 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Distribuicao</p>
                <h2 className="mt-2 text-2xl font-black text-green-200">Barra percentual</h2>
              </div>
              <span className="rounded-full border border-green-900 bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-green-500">
                Total {formatPercent(calculation.totalPercent)}
              </span>
            </div>

            <div className="mt-6 overflow-hidden rounded-full border border-green-900 bg-black/50">
              <div className="flex h-5 w-full">
                {distributionSegments.map((segment) => (
                  <div
                    key={segment.key}
                    className={`${segment.className} transition-all`}
                    style={{ width: `${Math.max(segment.percent, 0)}%` }}
                    title={`${segment.label}: ${formatPercent(segment.percent)}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[...summarizeConfig(config)].map((category) => {
                const livePercent = categories.find((entry) => entry.key === category.key)?.percent ?? category.percent;
                return (
                  <div key={category.key} className="flex items-center justify-between rounded-2xl border border-green-900 bg-black/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${category.visual.badgeClassName}`}>
                        {category.visual.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-green-200">{category.shortLabel}</p>
                        <p className="text-xs uppercase tracking-[0.12em] text-green-700">{category.label}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-black ${category.visual.textClassName}`}>{formatPercent(livePercent)}</p>
                  </div>
                );
              })}

              <div className="flex items-center justify-between rounded-2xl border border-slate-500/40 bg-slate-950/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-500/15 text-slate-300">💵</span>
                  <div>
                    <p className="text-sm font-semibold text-green-200">Repasse fornecedores</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-green-700">Saldo destinado aos fornecedores</p>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-300">
                  {calculation.isInvalid || calculation.remainingPercent === null ? "--" : formatPercent(calculation.remainingPercent)}
                </p>
              </div>
            </div>
          </article>
        </section>

        {(errorMessage || successMessage || copyMessage || loading) && (
          <section className="mt-4 rounded-2xl border border-green-900 bg-green-950/20 p-4">
            {loading ? <p className="text-sm font-semibold text-green-500">Carregando configuracoes...</p> : null}
            {errorMessage ? <p className="text-sm font-semibold text-rose-400">{errorMessage}</p> : null}
            {successMessage ? <p className="text-sm font-semibold text-emerald-400">{successMessage}</p> : null}
            {copyMessage ? <p className="text-sm font-semibold text-sky-400">{copyMessage}</p> : null}
          </section>
        )}

        <section className={`mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${calculation.isInvalid ? "opacity-80" : ""}`}>
          <ResultCard
            label="Total em Vendas"
            icon="💰"
            value={formatUsd(totalSales)}
            helper="Base da simulacao"
            className="border-green-900 bg-green-950/20"
            valueClassName="text-green-200"
          />

          {calculation.allocations.map((category) => (
            <ResultCard
              key={category.key}
              label={category.shortLabel}
              icon={category.visual.icon}
              value={formatUsd(category.amount)}
              helper={`${formatPercent(category.percent)} da receita`}
              className={category.visual.cardClassName}
              valueClassName={category.visual.textClassName}
            />
          ))}

          <ResultCard
            label="Repasse Fornecedores"
            icon="💵"
            value={calculation.isInvalid || calculation.remainingValue === null ? "--" : formatUsd(calculation.remainingValue)}
            helper={
              calculation.isInvalid || calculation.remainingPercent === null
                ? "Ajuste os percentuais para visualizar"
                : `${formatPercent(calculation.remainingPercent)} do total para fornecedores`
            }
            className="border-slate-500/40 bg-slate-950/20"
            valueClassName="text-slate-200"
          />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[1.8rem] border border-green-900 bg-green-950/20 p-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Simulador mensal</p>
              <h2 className="text-2xl font-black text-green-200">Lucro estimado no mes</h2>
              <p className="text-sm leading-7 text-green-600">
                Informe a quantidade media de vendas por dia para projetar o faturamento mensal e calcular o lucro com base nos percentuais atuais.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-xs font-bold uppercase tracking-[0.15em] text-green-600">
                Vendas por dia
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={salesPerDayInput}
                  onChange={(event) => setSalesPerDayInput(event.target.value)}
                  placeholder="12"
                  className="block w-full rounded-2xl border border-green-800 bg-black px-4 py-4 text-xl font-black text-green-200 outline-none transition focus:border-green-600"
                />
              </label>

              <label className="space-y-2 text-xs font-bold uppercase tracking-[0.15em] text-green-600">
                Ticket medio por venda
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={averageSaleValueInput}
                  onChange={(event) => setAverageSaleValueInput(event.target.value)}
                  placeholder="100"
                  className="block w-full rounded-2xl border border-green-800 bg-black px-4 py-4 text-xl font-black text-green-200 outline-none transition focus:border-green-600"
                />
              </label>

              <label className="space-y-2 text-xs font-bold uppercase tracking-[0.15em] text-green-600">
                Dias com vendas no mes
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="31"
                  step="1"
                  value={activeDaysInput}
                  onChange={(event) => setActiveDaysInput(event.target.value)}
                  placeholder="30"
                  className="block w-full rounded-2xl border border-green-800 bg-black px-4 py-4 text-xl font-black text-green-200 outline-none transition focus:border-green-600"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <ResultCard
                label="Faturamento Mensal"
                icon="🗓️"
                value={formatUsd(estimatedMonthlyRevenue)}
                helper={`${salesPerDay.toFixed(0)} vendas/dia por ${activeDays} dias`}
                className="border-cyan-500/40 bg-cyan-950/20"
                valueClassName="text-cyan-300"
                valueSizeClassName="text-2xl"
                helperClassName="text-[0.7rem]"
              />
              <ResultCard
                label="Lucro do Mes"
                icon="💸"
                value={monthlySimulation.isInvalid ? "--" : formatUsd(monthlyProfit)}
                helper={`Margem de ${formatPercent(categories.find((category) => category.key === "profitMargin")?.percent ?? 0)}`}
                className="border-emerald-500/40 bg-emerald-950/20"
                valueClassName="text-emerald-300"
                valueSizeClassName="text-2xl"
                helperClassName="text-[0.7rem]"
              />
              <ResultCard
                label="Retencao Mensal"
                icon="🎁"
                value={
                  monthlySimulation.isInvalid
                    ? "--"
                    : formatUsd(monthlySimulation.allocations.find((category) => category.key === "retentionFund")?.amount ?? 0)
                }
                helper="Reserva mensal estimada"
                className="border-sky-500/40 bg-sky-950/20"
                valueClassName="text-sky-300"
                valueSizeClassName="text-2xl"
                helperClassName="text-[0.7rem]"
              />
              <ResultCard
                label="Repasse Fornecedores no Mes"
                icon="💼"
                value={monthlySimulation.isInvalid || monthlySimulation.remainingValue === null ? "--" : formatUsd(monthlySimulation.remainingValue)}
                helper={
                  monthlySimulation.isInvalid || monthlySimulation.remainingPercent === null
                    ? "Ajuste os percentuais"
                    : `${formatPercent(monthlySimulation.remainingPercent)} projetado para fornecedores`
                }
                className="border-slate-500/40 bg-slate-950/20"
                valueClassName="text-slate-200"
                valueSizeClassName="text-2xl"
                helperClassName="text-[0.7rem]"
              />
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-green-900 bg-green-950/20 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Resumo da projeção</p>
            <h2 className="mt-2 text-2xl font-black text-green-200">Leitura mensal</h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.4rem] border border-green-900 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-green-600">Formula</p>
                <p className="mt-2 text-sm leading-7 text-green-200">
                  {salesPerDay.toFixed(0)} vendas/dia x {formatUsd(averageSaleValue)} x {activeDays} dias = {formatUsd(estimatedMonthlyRevenue)}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-green-900 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-green-600">Lucro projetado</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {monthlySimulation.isInvalid ? "--" : formatUsd(monthlyProfit)}
                </p>
                <p className="mt-2 text-sm text-green-600">
                  Calculado com a margem de lucro atual e atualizado automaticamente conforme os percentuais mudam.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-green-900 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-green-600">Status da projeção</p>
                <p className={`mt-2 text-sm font-semibold ${monthlySimulation.isInvalid ? "text-rose-400" : "text-emerald-400"}`}>
                  {monthlySimulation.isInvalid
                    ? "A projeção mensal fica bloqueada enquanto a soma dos percentuais passar de 100%."
                    : "A projeção mensal está válida com os percentuais atuais."}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[1.8rem] border border-green-900 bg-green-950/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Resumo automatico</p>
                <h2 className="mt-2 text-2xl font-black text-green-200">Distribuicao pronta para compartilhar</h2>
              </div>
              <button
                type="button"
                onClick={() => void handleCopySummary()}
                disabled={calculation.isInvalid}
                className="rounded-md border border-green-800 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Copiar resumo
              </button>
            </div>

            <pre className="mt-5 whitespace-pre-wrap rounded-[1.5rem] border border-green-900 bg-black/40 p-5 text-sm leading-7 text-green-200">
              {summaryText}
            </pre>
          </article>

          <article className="rounded-[1.8rem] border border-green-900 bg-green-950/20 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Estado da configuracao</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-green-900 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-green-600">Percentual do repasse</p>
                <p className="mt-2 text-3xl font-black text-green-200">
                  {calculation.isInvalid || calculation.remainingPercent === null ? "--" : formatPercent(calculation.remainingPercent)}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-green-900 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-green-600">Valor do repasse</p>
                <p className="mt-2 text-3xl font-black text-green-200">
                  {calculation.isInvalid || calculation.remainingValue === null ? "--" : formatUsd(calculation.remainingValue)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-green-900 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-green-600">Persistencia</p>
              <p className="mt-2 text-sm leading-7 text-green-600">
                Os percentuais salvos ficam armazenados em configuracoes do sistema e sao recarregados sempre que o painel administrativo inicia.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
                {hasUnsavedChanges ? "Existem alteracoes nao salvas." : "Configuracao local sincronizada com o banco."}
              </p>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}