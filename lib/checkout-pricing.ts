const FALLBACK_RATES = {
  BRL: 1,
  USD: 0.18,
  EUR: 0.16,
  GBP: 0.14,
} as const;

export function getUsdToCurrencyRate(currency: string, rates: Record<string, number>) {
  const normalizedCurrency = (currency ?? "USD").toUpperCase();

  if (normalizedCurrency === "USD") {
    return 1;
  }

  const sourceRate = rates.USD ?? FALLBACK_RATES.USD;
  const targetRate = rates[normalizedCurrency] ?? FALLBACK_RATES[normalizedCurrency as keyof typeof FALLBACK_RATES] ?? 1;

  if (sourceRate <= 0 || targetRate <= 0) {
    return 1;
  }

  return targetRate / sourceRate;
}
