export type SupportedCurrency = "USD" | "BRL" | "EUR" | "GBP";

export const DEFAULT_USD_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  BRL: 5.5,
  EUR: 0.92,
  GBP: 0.79,
};

export function normalizeCurrency(value: unknown): SupportedCurrency {
  if (typeof value !== "string") return "USD";

  const normalized = value.trim().toUpperCase();
  return normalized === "BRL" || normalized === "EUR" || normalized === "GBP" ? normalized : "USD";
}

export function convertCentsToUsdCents(amountCents: number, currency: SupportedCurrency, rates = DEFAULT_USD_RATES) {
  if (!Number.isFinite(amountCents) || currency === "USD") {
    return Math.round(Number.isFinite(amountCents) ? amountCents : 0);
  }

  const unitsPerUsd = rates[currency];
  if (!Number.isFinite(unitsPerUsd) || unitsPerUsd <= 0) {
    return Math.round(amountCents);
  }

  return Math.round((amountCents / unitsPerUsd));
}

export async function getUsdRates(): Promise<Record<SupportedCurrency, number>> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 300 },
    });

    if (!response.ok) return DEFAULT_USD_RATES;

    const payload = (await response.json()) as { rates?: Record<string, number> };
    const rates = {
      USD: 1,
      BRL: payload.rates?.BRL ?? DEFAULT_USD_RATES.BRL,
      EUR: payload.rates?.EUR ?? DEFAULT_USD_RATES.EUR,
      GBP: payload.rates?.GBP ?? DEFAULT_USD_RATES.GBP,
    };

    return Object.entries(rates).every(([, value]) => Number.isFinite(value) && value > 0)
      ? rates
      : DEFAULT_USD_RATES;
  } catch {
    return DEFAULT_USD_RATES;
  }
}
