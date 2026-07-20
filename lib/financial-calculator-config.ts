export const FINANCIAL_CALCULATOR_CONFIG_VERSION = 1;
export const FINANCIAL_CALCULATOR_CONFIG_DOC_ID = "financial-calculator";

export type FinancialCalculatorConfig = {
  schemaVersion: number;
  updatedAtMs: number;
  currency: "USD";
  supplierPercentage: number;
  cardGatewayFeePercent: number;
  cashbackPercent: number;
  operationalReservePercent: number;
  agentCommissionPercent: number;
  otherProjectsInvestmentPercent: number;
  defaultSalesPerDay: number;
  defaultAverageTicket: number;
  defaultActiveDays: number;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function clampPercent(value: unknown, fallback: number) {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Number(parsed.toFixed(2))));
}

function clampNonNegativeInt(value: unknown, fallback: number) {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.max(0, Math.round(parsed));
}

function readLegacyCategoryPercent(source: unknown, key: string): number | null {
  if (!Array.isArray(source)) {
    return null;
  }

  for (const entry of source) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as { key?: unknown; percent?: unknown };
    if (record.key === key) {
      return asFiniteNumber(record.percent);
    }
  }

  return null;
}

export function buildDefaultFinancialCalculatorConfig(): FinancialCalculatorConfig {
  return {
    schemaVersion: FINANCIAL_CALCULATOR_CONFIG_VERSION,
    updatedAtMs: Date.now(),
    currency: "USD",
    supplierPercentage: 75,
    cardGatewayFeePercent: 2,
    cashbackPercent: 7,
    operationalReservePercent: 3,
    agentCommissionPercent: 0,
    otherProjectsInvestmentPercent: 0,
    defaultSalesPerDay: 12,
    defaultAverageTicket: 100,
    defaultActiveDays: 30,
  };
}

export function sanitizeFinancialCalculatorConfig(source: unknown): FinancialCalculatorConfig {
  const fallback = buildDefaultFinancialCalculatorConfig();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<FinancialCalculatorConfig> & {
    categories?: unknown;
  };

  const legacyProfitMargin = readLegacyCategoryPercent(parsed.categories, "profitMargin") ?? 0;
  const legacyRetentionFund = readLegacyCategoryPercent(parsed.categories, "retentionFund") ?? fallback.cashbackPercent;
  const legacyPlatformFee = readLegacyCategoryPercent(parsed.categories, "platformFee") ?? fallback.cardGatewayFeePercent;
  const legacyOtherCosts = readLegacyCategoryPercent(parsed.categories, "otherCosts") ?? fallback.operationalReservePercent;

  const legacyAllocated = Math.max(0, legacyProfitMargin + legacyRetentionFund + legacyPlatformFee + legacyOtherCosts);
  const legacySupplierFallback = Math.max(0, 100 - legacyAllocated);

  return {
    schemaVersion: FINANCIAL_CALCULATOR_CONFIG_VERSION,
    updatedAtMs: asFiniteNumber(parsed.updatedAtMs) ?? Date.now(),
    currency: "USD",
    supplierPercentage: clampPercent(parsed.supplierPercentage, legacySupplierFallback || fallback.supplierPercentage),
    cardGatewayFeePercent: clampPercent(parsed.cardGatewayFeePercent, legacyPlatformFee),
    cashbackPercent: clampPercent(parsed.cashbackPercent, legacyRetentionFund),
    operationalReservePercent: clampPercent(parsed.operationalReservePercent, legacyOtherCosts),
    agentCommissionPercent: clampPercent(parsed.agentCommissionPercent, fallback.agentCommissionPercent),
    otherProjectsInvestmentPercent: clampPercent(
      parsed.otherProjectsInvestmentPercent,
      fallback.otherProjectsInvestmentPercent,
    ),
    defaultSalesPerDay: clampNonNegativeInt(parsed.defaultSalesPerDay, fallback.defaultSalesPerDay),
    defaultAverageTicket: clampNonNegativeInt(parsed.defaultAverageTicket, fallback.defaultAverageTicket),
    defaultActiveDays: clampNonNegativeInt(parsed.defaultActiveDays, fallback.defaultActiveDays),
  };
}
