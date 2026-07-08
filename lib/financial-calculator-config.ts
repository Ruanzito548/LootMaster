import { getAdminDb } from "@/lib/firebase-admin";

export const FINANCIAL_CALCULATOR_CONFIG_VERSION = 1;
export const FINANCIAL_CALCULATOR_CONFIG_DOC_ID = "financial-calculator";

export type FinancialDistributionCategoryKey =
  | "profitMargin"
  | "retentionFund"
  | "platformFee"
  | "otherCosts";

export type FinancialDistributionCategory = {
  key: FinancialDistributionCategoryKey;
  label: string;
  shortLabel: string;
  percent: number;
};

export type FinancialCalculatorConfig = {
  schemaVersion: number;
  updatedAtMs: number;
  currency: "USD";
  categories: FinancialDistributionCategory[];
};

const DEFAULT_CATEGORIES: FinancialDistributionCategory[] = [
  {
    key: "profitMargin",
    label: "Margem de Lucro",
    shortLabel: "Lucro",
    percent: 18,
  },
  {
    key: "retentionFund",
    label: "Fundo de Retencao de Clientes",
    shortLabel: "Retencao",
    percent: 7,
  },
  {
    key: "platformFee",
    label: "Taxa da Plataforma",
    shortLabel: "Plataforma",
    percent: 0,
  },
  {
    key: "otherCosts",
    label: "Outros Custos",
    shortLabel: "Outros Custos",
    percent: 0,
  },
];

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

function isCategoryKey(value: unknown): value is FinancialDistributionCategoryKey {
  return DEFAULT_CATEGORIES.some((category) => category.key === value);
}

export function buildDefaultFinancialCalculatorConfig(): FinancialCalculatorConfig {
  return {
    schemaVersion: FINANCIAL_CALCULATOR_CONFIG_VERSION,
    updatedAtMs: Date.now(),
    currency: "USD",
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
  };
}

export function sanitizeFinancialCalculatorConfig(source: unknown): FinancialCalculatorConfig {
  const fallback = buildDefaultFinancialCalculatorConfig();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<FinancialCalculatorConfig>;

  if (parsed.schemaVersion !== FINANCIAL_CALCULATOR_CONFIG_VERSION || !Array.isArray(parsed.categories)) {
    return fallback;
  }

  const parsedByKey = new Map<FinancialDistributionCategoryKey, Partial<FinancialDistributionCategory>>();

  for (const entry of parsed.categories) {
    if (!entry || typeof entry !== "object" || !isCategoryKey((entry as { key?: unknown }).key)) {
      continue;
    }

    parsedByKey.set(entry.key, entry);
  }

  return {
    schemaVersion: FINANCIAL_CALCULATOR_CONFIG_VERSION,
    updatedAtMs: asFiniteNumber(parsed.updatedAtMs) ?? Date.now(),
    currency: "USD",
    categories: fallback.categories.map((category) => {
      const nextEntry = parsedByKey.get(category.key);

      return {
        ...category,
        label: typeof nextEntry?.label === "string" && nextEntry.label.trim() ? nextEntry.label : category.label,
        shortLabel:
          typeof nextEntry?.shortLabel === "string" && nextEntry.shortLabel.trim()
            ? nextEntry.shortLabel
            : category.shortLabel,
        percent: clampPercent(nextEntry?.percent, category.percent),
      };
    }),
  };
}

export async function getLiveFinancialCalculatorConfig(): Promise<FinancialCalculatorConfig> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("app-config").doc(FINANCIAL_CALCULATOR_CONFIG_DOC_ID).get();

  if (!snapshot.exists) {
    return buildDefaultFinancialCalculatorConfig();
  }

  return sanitizeFinancialCalculatorConfig(snapshot.data());
}