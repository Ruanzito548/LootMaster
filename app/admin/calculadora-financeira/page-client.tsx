"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  BadgePercent,
  Banknote,
  BarChart3,
  Clock3,
  Copy,
  History,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";

import {
  buildDefaultFinancialCalculatorConfig,
  type FinancialCalculatorConfig,
  type FinancialDistributionCategory,
  type FinancialDistributionCategoryKey,
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

type FinancialSegment = {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  percent: number;
  color: string;
  accentClassName: string;
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

function useAnimatedNumber(target: number, duration = 420) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    let animationFrame = 0;
    const from = value;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, target, value]);

  return value;
}

function formatShortPercent(value: number) {
  return `${Number(value.toFixed(2)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function buildSegments(calculation: DistributionCalculation): FinancialSegment[] {
  return [
    {
      key: "profitMargin",
      label: "Lucro",
      shortLabel: "Lucro",
      value: calculation.allocations.find((category) => category.key === "profitMargin")?.amount ?? 0,
      percent: calculation.allocations.find((category) => category.key === "profitMargin")?.percent ?? 0,
      color: "#22c55e",
      accentClassName: "border-emerald-500/40 bg-emerald-950/20 text-emerald-300",
    },
    {
      key: "retentionFund",
      label: "Retenção",
      shortLabel: "Retenção",
      value: calculation.allocations.find((category) => category.key === "retentionFund")?.amount ?? 0,
      percent: calculation.allocations.find((category) => category.key === "retentionFund")?.percent ?? 0,
      color: "#eab308",
      accentClassName: "border-amber-500/40 bg-amber-950/20 text-amber-300",
    },
    {
      key: "platformFee",
      label: "Plataforma",
      shortLabel: "Plataforma",
      value: calculation.allocations.find((category) => category.key === "platformFee")?.amount ?? 0,
      percent: calculation.allocations.find((category) => category.key === "platformFee")?.percent ?? 0,
      color: "#a855f7",
      accentClassName: "border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-300",
    },
    {
      key: "otherCosts",
      label: "Custos",
      shortLabel: "Custos",
      value: calculation.allocations.find((category) => category.key === "otherCosts")?.amount ?? 0,
      percent: calculation.allocations.find((category) => category.key === "otherCosts")?.percent ?? 0,
      color: "#f97316",
      accentClassName: "border-orange-500/40 bg-orange-950/20 text-orange-300",
    },
    {
      key: "supplierPayout",
      label: "Repasse",
      shortLabel: "Repasse",
      value: calculation.remainingValue ?? 0,
      percent: calculation.remainingPercent ?? 0,
      color: "#9ca3af",
      accentClassName: "border-slate-500/40 bg-slate-950/20 text-slate-200",
    },
  ];
}

function DonutChart({ segments, invalid }: { segments: FinancialSegment[]; invalid: boolean }) {
  const strokeWidth = 24;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.percent), 0) || 1;
  const segmentOffsets = segments.map((segment, index) =>
    segments.slice(0, index).reduce((sum, previous) => sum + (Math.max(0, previous.percent) / total) * circumference, 0),
  );

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-56 w-56 drop-shadow-[0_20px_35px_rgba(0,0,0,0.35)]">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {segments.map((segment, index) => {
          const length = (Math.max(0, segment.percent) / total) * circumference;

          return (
            <circle
              key={segment.key}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={invalid ? "rgba(248,113,113,0.65)" : segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(length, 0.001)} ${circumference}`}
              strokeDashoffset={-segmentOffsets[index]}
              transform="rotate(-90 110 110)"
            />
          );
        })}
        <circle cx="110" cy="110" r="54" fill="rgba(4,8,15,0.96)" stroke="rgba(148,163,184,0.12)" />
        <text x="110" y="103" textAnchor="middle" className="fill-green-100 text-[12px] font-bold uppercase tracking-[0.22em]">
          Repasse
        </text>
        <text x="110" y="128" textAnchor="middle" className="fill-white text-[28px] font-black">
          {invalid ? "--" : formatShortPercent(segments.find((segment) => segment.key === "supplierPayout")?.percent ?? 0)}
        </text>
      </svg>
    </div>
  );
}

function MetricCard({
  title,
  icon: Icon,
  value,
  helper,
  toneClassName,
}: {
  title: string;
  icon: typeof Banknote;
  value: string;
  helper: string;
  toneClassName: string;
}) {
  return (
    <article className={`rounded-[1.5rem] border p-4 shadow-[0_14px_35px_rgba(0,0,0,0.2)] ${toneClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/70">{title}</p>
          <p className="mt-3 text-[1.75rem] font-black leading-none text-white tabular-nums sm:text-[2rem]">{value}</p>
        </div>
        <span className="rounded-2xl bg-white/10 p-2 text-white/90 ring-1 ring-white/10">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-white/65">{helper}</p>
    </article>
  );
}

function ConfigRow({
  label,
  value,
  percentInput,
  onChange,
  invalid,
  helper,
}: {
  label: string;
  value: string;
  percentInput: string;
  onChange: (next: string) => void;
  invalid: boolean;
  helper: string;
}) {
  return (
    <div className={`grid gap-3 rounded-2xl border px-4 py-3 md:grid-cols-[1.2fr_140px_140px] md:items-center ${invalid ? "border-rose-500/50 bg-rose-950/10" : "border-white/10 bg-white/[0.03]"}`}>
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{helper}</p>
      </div>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        %
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          value={percentInput}
          onChange={(event) => onChange(event.target.value)}
          className={`rounded-xl border px-3 py-2 text-base font-black outline-none transition tabular-nums ${invalid ? "border-rose-500/60 bg-rose-950/20 text-rose-100 focus:border-rose-400" : "border-white/10 bg-black/30 text-white focus:border-cyan-400"}`}
        />
      </label>
      <div className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        Valor correspondente
        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-base font-black text-cyan-200 tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
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
  const [history, setHistory] = useState<FinancialCalculatorHistory>(HISTORY_FALLBACK);

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

  const profitPercent = useMemo(
    () => categories.find((category) => category.key === "profitMargin")?.percent ?? 0,
    [categories],
  );

  const profitValue = useMemo(
    () => calculation.allocations.find((category) => category.key === "profitMargin")?.amount ?? 0,
    [calculation.allocations],
  );

  const retentionValue = useMemo(
    () => calculation.allocations.find((category) => category.key === "retentionFund")?.amount ?? 0,
    [calculation.allocations],
  );

  const supplierValue = useMemo(() => calculation.remainingValue ?? 0, [calculation.remainingValue]);

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

  const monthlyRetention = useMemo(
    () => monthlySimulation.allocations.find((category) => category.key === "retentionFund")?.amount ?? 0,
    [monthlySimulation.allocations],
  );

  const monthlySupplierPayout = useMemo(() => monthlySimulation.remainingValue ?? 0, [monthlySimulation.remainingValue]);

  const defaultPercentInputs = useMemo(() => toPercentInputMap(DEFAULT_CONFIG.categories), []);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(percentInputs) !== JSON.stringify(toPercentInputMap(config.categories)),
    [config.categories, percentInputs],
  );

  const currentConfigLastUpdatedLabel = useMemo(() => {
    if (!history.updatedAt) {
      return "Sem atualizacao registrada";
    }

    return new Date(history.updatedAt).toLocaleString("pt-BR");
  }, [history.updatedAt]);

  const previousConfigLastUpdatedLabel = useMemo(() => {
    if (!history.previousUpdatedAt) {
      return "Sem historico anterior";
    }

    return new Date(history.previousUpdatedAt).toLocaleString("pt-BR");
  }, [history.previousUpdatedAt]);

  const summaryText = useMemo(() => {
    return [
      `Receita total: ${formatUsd(totalSales)}`,
      `Lucro: ${formatUsd(profitValue)} (${formatPercent(profitPercent)})`,
      `Retencao: ${formatUsd(retentionValue)}`,
      `Repasse aos fornecedores: ${formatUsd(supplierValue)}`,
      `Margem liquida: ${formatPercent(profitPercent)}`,
    ].join("\n");
  }, [profitPercent, profitValue, retentionValue, supplierValue, totalSales]);

  const segments = useMemo(() => buildSegments(calculation), [calculation]);

  const profitNumber = useAnimatedNumber(calculation.isInvalid ? 0 : profitValue);
  const retentionNumber = useAnimatedNumber(calculation.isInvalid ? 0 : retentionValue);
  const supplierNumber = useAnimatedNumber(calculation.isInvalid ? 0 : supplierValue);
  const revenueNumber = useAnimatedNumber(totalSales);
  const marginNumber = useAnimatedNumber(profitPercent);

  const monthlyRevenueNumber = useAnimatedNumber(estimatedMonthlyRevenue);
  const monthlyProfitNumber = useAnimatedNumber(monthlySimulation.isInvalid ? 0 : monthlyProfit);
  const monthlyRetentionNumber = useAnimatedNumber(monthlySimulation.isInvalid ? 0 : monthlyRetention);
  const monthlySupplierNumber = useAnimatedNumber(monthlySimulation.isInvalid ? 0 : monthlySupplierPayout);

  const insights = useMemo(() => {
    const items = [
      `A margem de lucro representa ${formatPercent(profitPercent)} da receita.`,
      monthlySimulation.isInvalid
        ? "A projeção mensal está bloqueada porque a soma dos percentuais ultrapassa 100%."
        : `O fundo de retenção deve acumular aproximadamente ${formatUsd(monthlyRetention)} neste mês.`,
      monthlySimulation.isInvalid
        ? ""
        : `O repasse aos fornecedores será de ${formatUsd(monthlySupplierPayout)} no cenário atual.`,
      profitPercent >= 15
        ? "Sua margem operacional atual parece saudável."
        : "Considere revisar a margem de lucro para aumentar o retorno operacional.",
    ];

    return items.filter(Boolean);
  }, [monthlyRetention, monthlySimulation.isInvalid, monthlySupplierPayout, profitPercent]);

  const canRestorePrevious = Boolean(history.previousConfig);

  const saveConfiguration = async (nextConfig: FinancialCalculatorConfig, successLabel: string) => {
    if (saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
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
      setHistory(payload.history ?? HISTORY_FALLBACK);
      setSuccessMessage(successLabel);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save calculator settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCurrent = async () => {
    if (calculation.isInvalid) {
      return;
    }

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

    await saveConfiguration(nextConfig, "Configuração financeira salva.");
  };

  const handleRestorePrevious = async () => {
    if (!history.previousConfig) {
      return;
    }

    await saveConfiguration(history.previousConfig, "Configuração anterior restaurada.");
  };

  const handleRestoreDefaults = () => {
    setPercentInputs(defaultPercentInputs);
    setSuccessMessage(null);
    setCopyMessage(null);
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

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyMessage("Resumo copiado.");
    } catch {
      setCopyMessage("Nao foi possivel copiar o resumo.");
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100" style={{ fontFamily: DEFAULT_PAGE_FONT_FAMILY }}>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,rgba(8,12,20,0.98),rgba(6,9,15,0.96))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Admin / Financeiro
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Calculadora Financeira</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Dashboard financeiro profissional para acompanhar receita, lucro, retenção e repasse aos fornecedores em tempo real.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveCurrent()}
                disabled={saving || calculation.isInvalid || !hasUnsavedChanges || loading}
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
                Padrão
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
                Limpar
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

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Receita Total"
            icon={Banknote}
            value={revenueNumber === 0 && !salesInput ? "--" : formatUsd(calculation.isInvalid ? 0 : revenueNumber)}
            helper={calculation.isInvalid ? "Ajuste os percentuais" : "Base da simulação"}
            toneClassName="border-sky-500/20 bg-gradient-to-br from-sky-500/20 to-sky-950/40"
          />
          <MetricCard
            title="Lucro"
            icon={TrendingUp}
            value={calculation.isInvalid ? "--" : formatUsd(profitNumber)}
            helper={`Margem ${formatShortPercent(marginNumber)}`}
            toneClassName="border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-emerald-950/40"
          />
          <MetricCard
            title="Retenção"
            icon={Wallet}
            value={calculation.isInvalid ? "--" : formatUsd(retentionNumber)}
            helper="Fundo de clientes"
            toneClassName="border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-amber-950/40"
          />
          <MetricCard
            title="Repasse aos Fornecedores"
            icon={Truck}
            value={calculation.isInvalid ? "--" : formatUsd(supplierNumber)}
            helper={`Saldo ${calculation.isInvalid || calculation.remainingPercent === null ? "--" : formatShortPercent(calculation.remainingPercent)}`}
            toneClassName="border-slate-500/20 bg-gradient-to-br from-slate-500/20 to-slate-950/40"
          />
          <MetricCard
            title="Margem Líquida (%)"
            icon={BadgePercent}
            value={calculation.isInvalid ? "--" : formatShortPercent(marginNumber)}
            helper="Lucro sobre a receita"
            toneClassName="border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-950/40"
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Configuração</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Percentuais e valor correspondente</h2>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${calculation.isInvalid ? "border-rose-400/25 bg-rose-500/10 text-rose-300" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"}`}>
                Total dos percentuais: {formatShortPercent(calculation.totalPercent)}
              </div>
            </div>

            {calculation.isInvalid ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                A soma dos percentuais não pode ultrapassar 100%.
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {categories.map((category) => {
                const amount = calculation.isInvalid ? null : calculation.allocations.find((item) => item.key === category.key)?.amount ?? 0;

                return (
                  <ConfigRow
                    key={category.key}
                    label={category.label}
                    value={amount === null ? "--" : formatUsd(amount)}
                    percentInput={percentInputs[category.key] ?? "0"}
                    onChange={(next) => setPercentInputs((current) => ({ ...current, [category.key]: next }))}
                    invalid={calculation.isInvalid}
                    helper={`Atualize a percentagem para ${category.shortLabel.toLowerCase()}.`}
                  />
                );
              })}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Distribuição Financeira</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Donut da distribuição</h2>
              </div>
              <BarChart3 className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-3">
                {calculation.isInvalid ? (
                  <div className="flex h-56 items-center justify-center rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 px-6 text-center text-sm font-semibold text-rose-200">
                    Ajuste os percentuais para visualizar a distribuição.
                  </div>
                ) : (
                  <DonutChart segments={segments} invalid={false} />
                )}
              </div>

              <div className="space-y-2">
                {segments.map((segment) => (
                  <div key={segment.key} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${segment.key === "supplierPayout" ? "border-slate-400/20 bg-slate-500/5" : "border-white/10 bg-black/20"}`}>
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                      <div>
                        <p className="font-semibold text-white">{segment.label}</p>
                        <p className="text-xs text-slate-400">{formatShortPercent(segment.percent)}</p>
                      </div>
                    </div>
                    <p className="font-black text-white tabular-nums">{calculation.isInvalid && segment.key === "supplierPayout" ? "--" : formatUsd(segment.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Simulador Mensal</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Previsão compacta do mês</h2>
              </div>
              <Clock3 className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { label: "Vendas por dia", value: salesPerDayInput, onChange: setSalesPerDayInput, placeholder: "12" },
                { label: "Ticket médio", value: averageSaleValueInput, onChange: setAverageSaleValueInput, placeholder: "100" },
                { label: "Dias vendidos", value: activeDaysInput, onChange: setActiveDaysInput, placeholder: "30" },
              ].map((field) => (
                <label key={field.label} className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {field.label}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    placeholder={field.placeholder}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-lg font-black text-white outline-none transition focus:border-cyan-400"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-white/10">
                  <tr className="bg-sky-500/5">
                    <td className="px-4 py-3 text-slate-300">Receita mensal</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-sky-300 tabular-nums">
                      {monthlySimulation.isInvalid ? "--" : formatUsd(monthlyRevenueNumber)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-500/5">
                    <td className="px-4 py-3 text-slate-300">Lucro mensal</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-emerald-300 tabular-nums">
                      {monthlySimulation.isInvalid ? "--" : formatUsd(monthlyProfitNumber)}
                    </td>
                  </tr>
                  <tr className="bg-amber-500/5">
                    <td className="px-4 py-3 text-slate-300">Retenção mensal</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-amber-300 tabular-nums">
                      {monthlySimulation.isInvalid ? "--" : formatUsd(monthlyRetentionNumber)}
                    </td>
                  </tr>
                  <tr className="bg-slate-500/5">
                    <td className="px-4 py-3 text-slate-300">Repasse mensal</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-slate-200 tabular-nums">
                      {monthlySimulation.isInvalid ? "--" : formatUsd(monthlySupplierNumber)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {monthlySimulation.isInvalid ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                A soma dos percentuais precisa ficar em até 100% para liberar a projeção mensal.
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {salesPerDay.toFixed(0)} vendas/dia × {formatUsd(averageSaleValue)} × {activeDays} dias = {formatUsd(monthlyRevenueNumber)}
              </p>
            )}
          </article>

          <div className="grid gap-5">
            <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Insights Financeiros</p>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Leituras automáticas</h2>
                </div>
                <Sparkles className="h-5 w-5 text-fuchsia-300" />
              </div>

              <ul className="mt-4 space-y-3">
                {insights.map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Histórico de Configurações</p>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Última alteração</h2>
                </div>
                <History className="h-5 w-5 text-slate-300" />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Usuário</p>
                  <p className="mt-1 font-semibold text-white">{history.updatedByLabel ?? history.updatedBy ?? "Sem registro"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Data</p>
                  <p className="mt-1 font-semibold text-white">{currentConfigLastUpdatedLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Configuração anterior</p>
                  <p className="mt-1 font-semibold text-white">{previousConfigLastUpdatedLabel}</p>
                  <p className="mt-1 text-xs text-slate-400">{history.previousUpdatedByLabel ?? history.previousUpdatedBy ?? "Sem histórico anterior"}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRestorePrevious}
                disabled={!canRestorePrevious}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCcw className="h-4 w-4" />
                Restaurar configuração anterior
              </button>
            </article>
          </div>
        </section>

        {(errorMessage || successMessage || copyMessage || loading) && (
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            {loading ? <p className="text-cyan-300">Carregando configurações...</p> : null}
            {errorMessage ? <p className="text-rose-300">{errorMessage}</p> : null}
            {successMessage ? <p className="text-emerald-300">{successMessage}</p> : null}
            {copyMessage ? <p className="text-sky-300">{copyMessage}</p> : null}
          </section>
        )}
      </main>
    </div>
  );
}