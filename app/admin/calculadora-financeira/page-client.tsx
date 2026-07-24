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
  agentCommissionPercent: string;
  otherProjectsInvestmentPercent: string;
};

type OperationalCostValueType = "percent" | "fixed";
type OperationalCostFrequency = "once" | "per_order" | "daily" | "weekly" | "monthly" | "annual";
type OperationalCostCurrency = "USD" | "BRL";

type OperationalCostItem = {
  id: string;
  name: string;
  value: number;
  valueType: OperationalCostValueType;
  currency: OperationalCostCurrency;
  frequency: OperationalCostFrequency;
  isActive: boolean;
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
const OPERATIONAL_COST_STORAGE_KEY = "financial-calculator-operational-cost-items-v1";
const DEFAULT_USD_TO_BRL_RATE = 5.5;

const DEFAULT_OPERATIONAL_COST_ITEMS: OperationalCostItem[] = [
  {
    id: "server-site",
    name: "Servidor do site",
    value: 40,
    valueType: "fixed",
    currency: "USD",
    frequency: "monthly",
    isActive: true,
  },
  {
    id: "impostos",
    name: "Impostos",
    value: 5,
    valueType: "percent",
    currency: "USD",
    frequency: "monthly",
    isActive: true,
  },
  {
    id: "third-party",
    name: "Servicos de terceiros",
    value: 20,
    valueType: "fixed",
    currency: "USD",
    frequency: "monthly",
    isActive: true,
  },
];

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

function parseOperationalCostItem(value: unknown): OperationalCostItem | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Partial<OperationalCostItem>;
  const name = typeof row.name === "string" ? row.name.trim() : "";

  if (!name) return null;

  const parsedValue = typeof row.value === "number" && Number.isFinite(row.value) ? row.value : 0;
  const valueType = row.valueType === "percent" || row.valueType === "fixed" ? row.valueType : "fixed";
  const currency = row.currency === "BRL" ? "BRL" : "USD";
  const frequency =
    row.frequency === "once" ||
    row.frequency === "per_order" ||
    row.frequency === "daily" ||
    row.frequency === "weekly" ||
    row.frequency === "monthly" ||
    row.frequency === "annual"
      ? row.frequency
      : "monthly";

  return {
    id: typeof row.id === "string" && row.id ? row.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    value: Math.max(0, parsedValue),
    valueType,
    currency,
    frequency,
    isActive: row.isActive !== false,
  };
}

function countMonthsInPeriod(daysInPeriod: number) {
  return Math.max(1, Math.ceil(daysInPeriod / 30));
}

function countWeeksInPeriod(daysInPeriod: number) {
  return Math.max(1, Math.ceil(daysInPeriod / 7));
}

function countYearsInPeriod(daysInPeriod: number) {
  return Math.max(1 / 365, daysInPeriod / 365);
}

function formatMoneyBrlFromUsdCents(amountInUsdCents: number, usdToBrlRate: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((amountInUsdCents / 100) * usdToBrlRate);
}

function toScenarioInputs(config: FinancialCalculatorConfig): ScenarioInputs {
  return {
    supplierPercentage: String(config.supplierPercentage),
    cardGatewayFeePercent: String(config.cardGatewayFeePercent),
    cashbackPercent: String(config.cashbackPercent),
    operationalReservePercent: String(config.operationalReservePercent),
    agentCommissionPercent: String(config.agentCommissionPercent),
    otherProjectsInvestmentPercent: String(config.otherProjectsInvestmentPercent),
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
  const [salesPerDayWithAgentInput, setSalesPerDayWithAgentInput] = useState(String(DEFAULT_CONFIG.defaultSalesPerDay));
  const [salesPerDayWithoutAgentInput, setSalesPerDayWithoutAgentInput] = useState("0");
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
  const [operationalCostItems, setOperationalCostItems] = useState<OperationalCostItem[]>(DEFAULT_OPERATIONAL_COST_ITEMS);
  const [usdToBrlRate, setUsdToBrlRate] = useState(DEFAULT_USD_TO_BRL_RATE);
  const [newOperationalCostName, setNewOperationalCostName] = useState("");
  const [newOperationalCostValue, setNewOperationalCostValue] = useState("0");
  const [newOperationalCostValueType, setNewOperationalCostValueType] = useState<OperationalCostValueType>("fixed");
  const [newOperationalCostCurrency, setNewOperationalCostCurrency] = useState<OperationalCostCurrency>("USD");
  const [newOperationalCostFrequency, setNewOperationalCostFrequency] = useState<OperationalCostFrequency>("monthly");

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
          setSalesPerDayWithAgentInput(String(payload.config.defaultSalesPerDay));
          setSalesPerDayWithoutAgentInput("0");
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OPERATIONAL_COST_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const recovered = parsed
        .map(parseOperationalCostItem)
        .filter((item): item is OperationalCostItem => item !== null);

      if (recovered.length > 0) {
        setOperationalCostItems(recovered);
      }
    } catch {
      // Keep defaults on malformed local data.
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadRate = async () => {
      try {
        const response = await fetch("/api/fx/usd-brl");
        const data = (await response.json()) as { usdToBrl?: number };
        if (ignore) return;

        if (typeof data.usdToBrl === "number" && Number.isFinite(data.usdToBrl) && data.usdToBrl > 0) {
          setUsdToBrlRate(data.usdToBrl);
        }
      } catch {
        if (!ignore) {
          setUsdToBrlRate(DEFAULT_USD_TO_BRL_RATE);
        }
      }
    };

    void loadRate();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(OPERATIONAL_COST_STORAGE_KEY, JSON.stringify(operationalCostItems));
  }, [operationalCostItems]);

  const salesPerDayWithAgent = useMemo(() => parseDecimalInput(salesPerDayWithAgentInput), [salesPerDayWithAgentInput]);
  const salesPerDayWithoutAgent = useMemo(() => parseDecimalInput(salesPerDayWithoutAgentInput), [salesPerDayWithoutAgentInput]);
  const salesPerDayTotal = useMemo(
    () => salesPerDayWithAgent + salesPerDayWithoutAgent,
    [salesPerDayWithAgent, salesPerDayWithoutAgent],
  );
  const averageSaleValue = useMemo(() => parseDecimalInput(averageSaleValueInput), [averageSaleValueInput]);
  const activeDays = useMemo(() => Math.max(0, Math.round(parseDecimalInput(activeDaysInput))), [activeDaysInput]);
  const monthlyRevenueCents = useMemo(
    () => Math.round(salesPerDayTotal * averageSaleValue * activeDays * 100),
    [activeDays, averageSaleValue, salesPerDayTotal],
  );
  const monthlyRevenueWithAgentCents = useMemo(
    () => Math.round(salesPerDayWithAgent * averageSaleValue * activeDays * 100),
    [activeDays, averageSaleValue, salesPerDayWithAgent],
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

  const agentCommissionPercent = useMemo(
    () => parseDecimalInput(scenarioInputs.agentCommissionPercent),
    [scenarioInputs.agentCommissionPercent],
  );
  const otherProjectsInvestmentPercent = useMemo(
    () => parseDecimalInput(scenarioInputs.otherProjectsInvestmentPercent),
    [scenarioInputs.otherProjectsInvestmentPercent],
  );

  const agentCommissionCost = useMemo(
    () => Math.max(0, Math.round(monthlyRevenueWithAgentCents * (agentCommissionPercent / 100))),
    [agentCommissionPercent, monthlyRevenueWithAgentCents],
  );

  const netProfit = useMemo(
    () => scenario.netProfit - agentCommissionCost,
    [agentCommissionCost, scenario.netProfit],
  );

  const investmentInOtherProjects = useMemo(
    () => (netProfit > 0 ? Math.max(0, Math.round(netProfit * (otherProjectsInvestmentPercent / 100))) : 0),
    [netProfit, otherProjectsInvestmentPercent],
  );

  const finalNetProfit = useMemo(
    () => netProfit - investmentInOtherProjects,
    [investmentInOtherProjects, netProfit],
  );

  const marginPercent = useMemo(
    () => (scenario.grossRevenue > 0 ? (netProfit / scenario.grossRevenue) * 100 : 0),
    [netProfit, scenario.grossRevenue],
  );

  const totalOrders = Math.max(0, Math.round(salesPerDayTotal * activeDays));
  const daysInPeriod = Math.max(1, activeDays);
  const monthsInPeriod = countMonthsInPeriod(daysInPeriod);
  const weeksInPeriod = countWeeksInPeriod(daysInPeriod);
  const yearsInPeriod = countYearsInPeriod(daysInPeriod);

  const operationalCostRows = operationalCostItems
    .filter((item) => item.isActive)
    .map((item) => {
      const unitCostCents =
        item.valueType === "percent"
          ? Math.round(scenario.grossRevenue * (item.value / 100))
          : item.currency === "BRL"
            ? Math.round((Math.max(0, item.value) * 100) / usdToBrlRate)
            : Math.round(Math.max(0, item.value) * 100);

      const multiplier =
        item.frequency === "per_order"
          ? totalOrders
          : item.frequency === "daily"
            ? daysInPeriod
            : item.frequency === "weekly"
              ? weeksInPeriod
              : item.frequency === "monthly"
                ? monthsInPeriod
                : item.frequency === "annual"
                  ? yearsInPeriod
                  : 1;

      return {
        ...item,
        totalCents: Math.max(0, Math.round(unitCostCents * Math.max(multiplier, 0))),
      };
    });

  const operationalCostTotal = operationalCostRows.reduce((acc, item) => acc + item.totalCents, 0);
  const operationalCostPerOrder = totalOrders > 0 ? Math.round(operationalCostTotal / totalOrders) : 0;
  const netAfterOperationalCosts = finalNetProfit - operationalCostTotal;
  const marginAfterOperationalCosts = scenario.grossRevenue > 0 ? (netAfterOperationalCosts / scenario.grossRevenue) * 100 : 0;

  const hasUnsavedChanges = useMemo(() => {
    return (
      parseDecimalInput(scenarioInputs.supplierPercentage) !== config.supplierPercentage ||
      parseDecimalInput(scenarioInputs.cardGatewayFeePercent) !== config.cardGatewayFeePercent ||
      parseDecimalInput(scenarioInputs.cashbackPercent) !== config.cashbackPercent ||
      parseDecimalInput(scenarioInputs.operationalReservePercent) !== config.operationalReservePercent ||
      parseDecimalInput(scenarioInputs.agentCommissionPercent) !== config.agentCommissionPercent ||
      parseDecimalInput(scenarioInputs.otherProjectsInvestmentPercent) !== config.otherProjectsInvestmentPercent ||
      Math.round(salesPerDayTotal) !== config.defaultSalesPerDay ||
      Math.round(parseDecimalInput(averageSaleValueInput)) !== config.defaultAverageTicket ||
      Math.round(parseDecimalInput(activeDaysInput)) !== config.defaultActiveDays
    );
  }, [averageSaleValueInput, activeDaysInput, config, salesPerDayTotal, scenarioInputs]);

  const summaryText = useMemo(() => {
    return [
      "Cenario financeiro (modelo novo):",
      `Receita bruta: ${formatUsdFromCents(scenario.grossRevenue)}`,
      `Fornecedor (${formatPercent(scenario.supplierPercentage)}): ${formatUsdFromCents(scenario.supplierPayout)}`,
      `Lucro bruto: ${formatUsdFromCents(scenario.grossProfit)}`,
      `Taxa cartao (${formatPercent(parseDecimalInput(scenarioInputs.cardGatewayFeePercent))}): ${formatUsdFromCents(scenario.cardFee)}`,
      `Cashback (${formatPercent(parseDecimalInput(scenarioInputs.cashbackPercent))}): ${formatUsdFromCents(scenario.cashback)}`,
      `Reserva operacional (${formatPercent(parseDecimalInput(scenarioInputs.operationalReservePercent))}): ${formatUsdFromCents(scenario.operationalReserve)}`,
      `Receita com agente vinculado: ${formatUsdFromCents(monthlyRevenueWithAgentCents)}`,
      `Comissao do agente (${formatPercent(agentCommissionPercent)}): ${formatUsdFromCents(agentCommissionCost)}`,
      `Lucro liquido: ${formatUsdFromCents(netProfit)}`,
      `Investimento em outros projetos (${formatPercent(otherProjectsInvestmentPercent)}): ${formatUsdFromCents(investmentInOtherProjects)}`,
      `Lucro liquido final: ${formatUsdFromCents(finalNetProfit)}`,
      `Margem liquida: ${formatPercent(marginPercent)}`,
      `Custos operacionais extras: ${formatUsdFromCents(operationalCostTotal)}`,
      `Lucro liquido apos custos extras: ${formatUsdFromCents(netAfterOperationalCosts)}`,
      `Margem apos custos extras: ${formatPercent(marginAfterOperationalCosts)}`,
    ].join("\n");
  }, [
    agentCommissionCost,
    agentCommissionPercent,
    finalNetProfit,
    investmentInOtherProjects,
    marginAfterOperationalCosts,
    marginPercent,
    monthlyRevenueWithAgentCents,
    netAfterOperationalCosts,
    netProfit,
    otherProjectsInvestmentPercent,
    operationalCostTotal,
    scenario,
    scenarioInputs.cardGatewayFeePercent,
    scenarioInputs.cashbackPercent,
    scenarioInputs.operationalReservePercent,
  ]);

  function updateOperationalCostItem(itemId: string, patch: Partial<OperationalCostItem>) {
    setOperationalCostItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        return {
          ...item,
          ...patch,
          name: (patch.name ?? item.name).trimStart(),
          value: Math.max(0, Number(patch.value ?? item.value) || 0),
        };
      }),
    );
  }

  function removeOperationalCostItem(itemId: string) {
    setOperationalCostItems((current) => current.filter((item) => item.id !== itemId));
  }

  function addOperationalCostItem() {
    const trimmedName = newOperationalCostName.trim();
    const parsedValue = Number(newOperationalCostValue.replace(",", "."));

    if (!trimmedName || !Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    const newItem: OperationalCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedName,
      value: parsedValue,
      valueType: newOperationalCostValueType,
      currency: newOperationalCostCurrency,
      frequency: newOperationalCostFrequency,
      isActive: true,
    };

    setOperationalCostItems((current) => [...current, newItem]);
    setNewOperationalCostName("");
    setNewOperationalCostValue("0");
    setNewOperationalCostValueType("fixed");
    setNewOperationalCostCurrency("USD");
    setNewOperationalCostFrequency("monthly");
  }

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
      setSalesPerDayWithAgentInput(String(payload.config.defaultSalesPerDay));
      setSalesPerDayWithoutAgentInput("0");
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
      agentCommissionPercent: parseDecimalInput(scenarioInputs.agentCommissionPercent),
      otherProjectsInvestmentPercent: parseDecimalInput(scenarioInputs.otherProjectsInvestmentPercent),
      defaultSalesPerDay: Math.round(salesPerDayTotal),
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
    setSalesPerDayWithAgentInput(String(defaults.defaultSalesPerDay));
    setSalesPerDayWithoutAgentInput("0");
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
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Ajustes Financeiros</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Simule cenarios com o mesmo metodo do dashboard: fornecedor, gateway, cashback, reserva operacional,
                comissao do agente e investimento em outros projetos.
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
            value={formatUsdFromCents(netAfterOperationalCosts)}
            helper={`Margem ${formatPercent(marginAfterOperationalCosts)} (apos custos extras)`}
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
                label="Gateway de pagamento (%)"
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
              <PercentRow
                label="Comissao do Agente (%)"
                helper="Comissao paga ao agente sobre a receita"
                value={scenarioInputs.agentCommissionPercent}
                onChange={(next) => setScenarioInputs((current) => ({ ...current, agentCommissionPercent: next }))}
              />
              <PercentRow
                label="Investimento em Outros Projetos (%)"
                helper="Percentual aplicado sobre o lucro liquido"
                value={scenarioInputs.otherProjectsInvestmentPercent}
                onChange={(next) =>
                  setScenarioInputs((current) => ({ ...current, otherProjectsInvestmentPercent: next }))
                }
              />
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-white/10">
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">Gateway de pagamento</td>
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
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">Comissao do Agente</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-300 tabular-nums">{formatUsdFromCents(agentCommissionCost)}</td>
                  </tr>
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">Investimento em Outros Projetos</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-300 tabular-nums">{formatUsdFromCents(investmentInOtherProjects)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Lucro Bruto</p>
                <p className="mt-1 text-sm font-black text-white">{formatUsdFromCents(scenario.grossProfit)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Lucro Liquido</p>
                <p className="mt-1 text-sm font-black text-white">{formatUsdFromCents(netProfit)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Investimento em Outros Projetos</p>
                <p className="mt-1 text-sm font-black text-cyan-300">{formatUsdFromCents(investmentInOtherProjects)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Lucro Liquido Final</p>
                <p className="mt-1 text-sm font-black text-emerald-300">{formatUsdFromCents(finalNetProfit)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Simulador</p>
              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Entradas do cenario</h2>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Vendas por dia (com agente)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={salesPerDayWithAgentInput}
                  onChange={(event) => setSalesPerDayWithAgentInput(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-3 text-base font-black text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Vendas por dia (sem agente)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={salesPerDayWithoutAgentInput}
                  onChange={(event) => setSalesPerDayWithoutAgentInput(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-3 text-base font-black text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Vendas por dia (totais)
                <input
                  type="number"
                  inputMode="decimal"
                  value={salesPerDayTotal.toFixed(2)}
                  readOnly
                  className="min-h-[48px] rounded-xl border border-white/10 bg-white/5 px-3 text-base font-black text-cyan-300 outline-none"
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
              {salesPerDayTotal.toFixed(2)} vendas/dia ({salesPerDayWithAgent.toFixed(2)} com agente + {salesPerDayWithoutAgent.toFixed(2)} sem agente) x {averageSaleValue.toFixed(2)} USD x {activeDays} dias
            </p>
            <p className="mt-2 text-lg font-black text-cyan-300">Receita: {formatUsdFromCents(monthlyRevenueCents)}</p>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:p-6 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Custos Operacionais</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Cadastro de custos</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Cadastre custos fixos ou percentuais e aplique frequencia por pedido, diaria, mensal ou anual.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                Cotacao USD/BRL: <span className="font-semibold text-cyan-300">{usdToBrlRate.toFixed(4)}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Custos totais</p>
                <p className="mt-1 text-sm font-black text-amber-300">{formatUsdFromCents(operationalCostTotal)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Custo por pedido</p>
                <p className="mt-1 text-sm font-black text-cyan-300">{formatUsdFromCents(operationalCostPerOrder)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Lucro liquido base</p>
                <p className="mt-1 text-sm font-black text-white">{formatUsdFromCents(finalNetProfit)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Liquido apos custos</p>
                <p className="mt-1 text-sm font-black text-fuchsia-300">{formatUsdFromCents(netAfterOperationalCosts)}</p>
                <p className="mt-1 text-[11px] text-fuchsia-200/80">{formatMoneyBrlFromUsdCents(netAfterOperationalCosts, usdToBrlRate)}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Periodo simulado: {daysInPeriod} dia(s), {monthsInPeriod} mes(es), {totalOrders} pedido(s). Custos percentuais usam receita bruta simulada.
            </p>

            <div className="mt-4 space-y-3">
              {operationalCostItems.map((item) => {
                const row = operationalCostRows.find((entry) => entry.id === item.id);
                const itemTotal = row?.totalCents ?? 0;

                return (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1.4fr_0.9fr]">
                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Nome
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateOperationalCostItem(item.id, { name: event.target.value })}
                          className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        />
                      </label>

                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Valor
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.value}
                          onChange={(event) => updateOperationalCostItem(item.id, { value: Number(event.target.value) || 0 })}
                          className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        />
                      </label>
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Tipo
                        <select
                          value={item.valueType}
                          onChange={(event) =>
                            updateOperationalCostItem(item.id, {
                              valueType: event.target.value as OperationalCostValueType,
                            })
                          }
                          className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        >
                          <option value="fixed">Valor fixo (USD/BRL)</option>
                          <option value="percent">Percentual (%)</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Moeda
                        <select
                          value={item.currency}
                          disabled={item.valueType === "percent"}
                          onChange={(event) =>
                            updateOperationalCostItem(item.id, {
                              currency: event.target.value as OperationalCostCurrency,
                            })
                          }
                          className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:opacity-50"
                        >
                          <option value="USD">USD</option>
                          <option value="BRL">BRL</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Frequencia
                        <select
                          value={item.frequency}
                          onChange={(event) =>
                            updateOperationalCostItem(item.id, {
                              frequency: event.target.value as OperationalCostFrequency,
                            })
                          }
                          className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                        >
                          <option value="once">Unico</option>
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                          <option value="annual">Anual</option>
                          <option value="per_order">Por pedido</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeOperationalCostItem(item.id)}
                        className="min-h-[40px] rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold uppercase tracking-[0.12em] text-rose-200 transition hover:bg-rose-500/20"
                      >
                        Remover
                      </button>
                    </div>

                    <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(event) => updateOperationalCostItem(item.id, { isActive: event.target.checked })}
                        className="h-4 w-4 rounded border-white/20 bg-black"
                      />
                      {item.isActive ? "Ativo" : "Inativo"}
                    </label>

                    <p className="mt-2 text-xs text-slate-400">
                      Custo no periodo: <span className="font-semibold text-amber-300">{formatUsdFromCents(itemTotal)}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Adicionar novo custo</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={newOperationalCostName}
                  onChange={(event) => setNewOperationalCostName(event.target.value)}
                  placeholder="Nome do custo"
                  className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newOperationalCostValue}
                  onChange={(event) => setNewOperationalCostValue(event.target.value)}
                  placeholder="Valor"
                  className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                />
                <select
                  value={newOperationalCostValueType}
                  onChange={(event) => setNewOperationalCostValueType(event.target.value as OperationalCostValueType)}
                  className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="fixed">Valor fixo (USD/BRL)</option>
                  <option value="percent">Percentual (%)</option>
                </select>
                <select
                  value={newOperationalCostCurrency}
                  disabled={newOperationalCostValueType === "percent"}
                  onChange={(event) => setNewOperationalCostCurrency(event.target.value as OperationalCostCurrency)}
                  className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:opacity-50"
                >
                  <option value="USD">USD</option>
                  <option value="BRL">BRL</option>
                </select>
                <select
                  value={newOperationalCostFrequency}
                  onChange={(event) => setNewOperationalCostFrequency(event.target.value as OperationalCostFrequency)}
                  className="min-h-[40px] rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="once">Unico</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="annual">Anual</option>
                  <option value="per_order">Por pedido</option>
                </select>
              </div>

              <button
                type="button"
                onClick={addOperationalCostItem}
                className="mt-3 min-h-[40px] rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 text-xs font-bold uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Adicionar custo
              </button>
            </div>
          </article>

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
