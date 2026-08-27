export type CheckoutGateway = "stripe" | "paypal";

export type CheckoutPaymentMethodId = "pix" | "card" | "paypal" | "balance";

export type CheckoutPaymentMethod = {
  id: CheckoutPaymentMethodId;
  label: string;
  description: string;
  gateway: CheckoutGateway | "internal";
  provider: "Pix" | "Stripe" | "PayPal" | "Loot Coins";
};

export type CheckoutCountryConfig = {
  countryCode: string;
  countryName: string;
  locale: string;
  currency: "BRL" | "USD" | "EUR";
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
  {
    id: "balance",
    label: "Loot Coins",
    description: "Pay using your Loot Coins balance.",
    gateway: "internal",
    provider: "Loot Coins",
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
  {
    id: "balance",
    label: "Loot Coins",
    description: "Pay using your Loot Coins balance.",
    gateway: "internal",
    provider: "Loot Coins",
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
    currency: "EUR",
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

const EUROPEAN_COUNTRY_CODES = new Set([
  "AD", "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
  "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT",
  "NL", "NO", "PL", "PT", "RO", "RS", "SE", "SI", "SK", "SM", "UA", "VA",
]);

export const CHECKOUT_CURRENCY_COUNTRY_CODES = {
  BRL: "BR",
  EUR: "DE",
  USD: "US",
} as const;

export type CheckoutCurrency = keyof typeof CHECKOUT_CURRENCY_COUNTRY_CODES;

export function resolveCheckoutCurrency(currency: string | null | undefined): CheckoutCountryConfig {
  const normalized = currency?.trim().toUpperCase() as CheckoutCurrency;
  const countryCode = CHECKOUT_CURRENCY_COUNTRY_CODES[normalized] ?? CHECKOUT_CURRENCY_COUNTRY_CODES.USD;
  return resolveCheckoutCountryConfig(countryCode);
}

export function normalizeCountryCode(input: string | null | undefined): string {
  if (!input) return DEFAULT_CHECKOUT_COUNTRY_CODE;
  return input.trim().toUpperCase();
}

export function resolveCheckoutCountryConfig(countryCode: string | null | undefined): CheckoutCountryConfig {
  const normalized = normalizeCountryCode(countryCode);
  if (CHECKOUT_COUNTRY_CONFIG[normalized]) {
    return CHECKOUT_COUNTRY_CONFIG[normalized];
  }

  if (EUROPEAN_COUNTRY_CODES.has(normalized)) {
    return {
      countryCode: normalized,
      countryName: normalized,
      locale: `en-${normalized}`,
      currency: "EUR",
      methods: INTERNATIONAL_METHODS,
    };
  }

  return {
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