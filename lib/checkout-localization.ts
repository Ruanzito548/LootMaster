export type CheckoutGateway = "stripe" | "paypal";

export type CheckoutPaymentMethodId = "pix" | "card" | "paypal";

export type CheckoutPaymentMethod = {
  id: CheckoutPaymentMethodId;
  label: string;
  description: string;
  gateway: CheckoutGateway;
  provider: "Pix" | "Stripe" | "PayPal";
};

export type CheckoutCountryConfig = {
  countryCode: string;
  countryName: string;
  locale: string;
  currency: "BRL" | "USD" | "EUR" | "GBP";
  methods: CheckoutPaymentMethod[];
};

const BRAZIL_METHODS: CheckoutPaymentMethod[] = [
  {
    id: "pix",
    label: "Pix (Brasil)",
    description: "Confirmacao instantanea.",
    gateway: "stripe",
    provider: "Pix",
  },
  {
    id: "card",
    label: "Cartao de Credito",
    description: "Pagamento seguro com Stripe.",
    gateway: "stripe",
    provider: "Stripe",
  },
];

const INTERNATIONAL_METHODS: CheckoutPaymentMethod[] = [
  {
    id: "card",
    label: "Credit Card (Stripe)",
    description: "Visa, Mastercard, American Express and others.",
    gateway: "stripe",
    provider: "Stripe",
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "Checkout with your PayPal account.",
    gateway: "paypal",
    provider: "PayPal",
  },
];

export const CHECKOUT_COUNTRY_CONFIG: Record<string, CheckoutCountryConfig> = {
  BR: {
    countryCode: "BR",
    countryName: "Brazil",
    locale: "pt-BR",
    currency: "BRL",
    methods: BRAZIL_METHODS,
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    locale: "en-US",
    currency: "USD",
    methods: INTERNATIONAL_METHODS,
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    locale: "en-GB",
    currency: "GBP",
    methods: INTERNATIONAL_METHODS,
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    locale: "de-DE",
    currency: "EUR",
    methods: INTERNATIONAL_METHODS,
  },
  FR: {
    countryCode: "FR",
    countryName: "France",
    locale: "fr-FR",
    currency: "EUR",
    methods: INTERNATIONAL_METHODS,
  },
  ES: {
    countryCode: "ES",
    countryName: "Spain",
    locale: "es-ES",
    currency: "EUR",
    methods: INTERNATIONAL_METHODS,
  },
  AR: {
    countryCode: "AR",
    countryName: "Argentina",
    locale: "es-AR",
    currency: "USD",
    methods: INTERNATIONAL_METHODS,
  },
};

export const DEFAULT_CHECKOUT_COUNTRY_CODE = "US";

export function normalizeCountryCode(input: string | null | undefined): string {
  if (!input) return DEFAULT_CHECKOUT_COUNTRY_CODE;
  return input.trim().toUpperCase();
}

export function resolveCheckoutCountryConfig(countryCode: string | null | undefined): CheckoutCountryConfig {
  const normalized = normalizeCountryCode(countryCode);
  return CHECKOUT_COUNTRY_CONFIG[normalized] ?? {
    countryCode: normalized,
    countryName: normalized,
    locale: "en-US",
    currency: "USD",
    methods: INTERNATIONAL_METHODS,
  };
}

export function resolveCountryFromHeaders(headers: Headers): string {
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length === 2) {
      return candidate.trim().toUpperCase();
    }
  }

  const acceptLanguage = headers.get("accept-language");
  if (acceptLanguage) {
    const first = acceptLanguage.split(",")[0]?.trim();
    if (first?.includes("-")) {
      const region = first.split("-")[1];
      if (region && region.length === 2) {
        return region.toUpperCase();
      }
    }
  }

  return DEFAULT_CHECKOUT_COUNTRY_CODE;
}