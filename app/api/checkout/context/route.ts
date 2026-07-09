import {
  CHECKOUT_COUNTRY_CONFIG,
  DEFAULT_CHECKOUT_COUNTRY_CODE,
  resolveCheckoutCountryConfig,
  resolveCountryFromHeaders,
} from "@/lib/checkout-localization";

type FxPayload = {
  rates: Record<string, number>;
};

const FALLBACK_RATES: Record<string, number> = {
  BRL: 1,
  USD: 0.18,
  EUR: 0.16,
  GBP: 0.14,
};

async function resolveBrlBaseRates() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/BRL", {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return FALLBACK_RATES;
    }

    const payload = (await response.json()) as FxPayload;
    const rates = payload.rates ?? {};

    return {
      BRL: 1,
      USD: typeof rates.USD === "number" && Number.isFinite(rates.USD) ? rates.USD : FALLBACK_RATES.USD,
      EUR: typeof rates.EUR === "number" && Number.isFinite(rates.EUR) ? rates.EUR : FALLBACK_RATES.EUR,
      GBP: typeof rates.GBP === "number" && Number.isFinite(rates.GBP) ? rates.GBP : FALLBACK_RATES.GBP,
    };
  } catch {
    return FALLBACK_RATES;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const overrideCountryCode = url.searchParams.get("countryCode");
  const detectedCountryCode = overrideCountryCode?.trim()
    ? overrideCountryCode.trim().toUpperCase()
    : resolveCountryFromHeaders(request.headers);

  const countryConfig = resolveCheckoutCountryConfig(detectedCountryCode || DEFAULT_CHECKOUT_COUNTRY_CODE);
  const rates = await resolveBrlBaseRates();

  return Response.json({
    detectedCountryCode,
    countryConfig,
    rates,
    supportedCountries: Object.values(CHECKOUT_COUNTRY_CONFIG),
  });
}