"use client";

import Link from "next/link";
import Image from "next/image";
import { startTransition, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Banknote, Check, Coins, CreditCard, Headphones, Landmark, Mail, ScrollText, ShieldCheck, Sparkles, Sword, Swords, UserRound, Zap } from "lucide-react";

import { defaultGoldConfigEntry, emptyGoldConfig, getGoldConfigFor } from "../data/gold-config";
import type { GameServer } from "../data/games";
import { subscribeToGoldConfig } from "../../lib/gold-config";
import { auth } from "../../lib/firebase";
import { getUsdToCurrencyRate } from "../../lib/checkout-pricing";
import type { CheckoutCurrency } from "../../lib/checkout-localization";

type GoldPurchaseMenuProps = {
  gameId: string;
  categoryId: string;
  gameTitle: string;
  servers: GameServer[];
};

type PaymentMethod = "pix" | "card" | "paypal" | "balance";

type CheckoutPaymentMethod = {
  id: PaymentMethod;
  label: string;
  description: string;
  gateway: "stripe" | "paypal" | "internal";
  provider: "Pix" | "Stripe" | "PayPal" | "Loot Coins";
};

type CountryConfig = {
  countryCode: string;
  countryName: string;
  locale: string;
  currency: CheckoutCurrency;
  methods: CheckoutPaymentMethod[];
  paymentMethods?: Record<PaymentMethod, boolean>;
};

const DEFAULT_COUNTRY_CONFIG: CountryConfig = {
  countryCode: "US",
  countryName: "United States",
  locale: "en-US",
  currency: "USD",
  methods: [
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
  ],
};

const FALLBACK_RATES: Record<string, number> = {
  BRL: 1,
  USD: 0.18,
  EUR: 0.16,
};
const DEFAULT_CARD_GATEWAY_FEE_PERCENT = 4;

const deliveryMethods = [
  { value: "Face to face", feeLabel: "0% fee" },
  { value: "Mailbox", feeLabel: "0% fee" },
];

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

function normalizeReferralCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export function GoldPurchaseMenu({ gameId, categoryId, gameTitle, servers }: GoldPurchaseMenuProps) {
  const [fullGoldConfig, setFullGoldConfig] = useState(emptyGoldConfig);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [goldAmount, setGoldAmount] = useState(defaultGoldConfigEntry.minGold);
  const [nickname, setNickname] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState(deliveryMethods[0].value);
  const [email, setEmail] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [countryConfig, setCountryConfig] = useState<CountryConfig>(DEFAULT_COUNTRY_CONFIG);
  const [supportedCurrencies, setSupportedCurrencies] = useState<CountryConfig[]>([DEFAULT_COUNTRY_CONFIG]);
  const [ratesByCurrency, setRatesByCurrency] = useState<Record<string, number>>(FALLBACK_RATES);
  const [cardGatewayFeePercent, setCardGatewayFeePercent] = useState(DEFAULT_CARD_GATEWAY_FEE_PERCENT);
  const [countryLoading, setCountryLoading] = useState(true);
  const [agentReferralCode, setAgentReferralCode] = useState("");

  const hasServerOptions = servers.length > 0;
  const requiresFaction = hasServerOptions && gameId !== "retail";

  useEffect(
    () =>
      subscribeToGoldConfig((config) => {
        startTransition(() => {
          setFullGoldConfig(config);
        });
      }),
    [],
  );

  useEffect(() => {
    if (!auth) {
      return () => undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user?.email) {
        setEmail((current) => (current.trim() ? current : user.email ?? current));
      }
    });
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCheckoutContext = async (countryCode?: string) => {
      try {
        const query = countryCode ? `?countryCode=${countryCode}` : "";
        const response = await fetch(`/api/checkout/context${query}`);
        const data = (await response.json()) as {
          countryConfig?: CountryConfig;
          supportedCountries?: CountryConfig[];
          rates?: Record<string, number>;
          cardGatewayFeePercent?: number;
          paymentMethods?: Record<PaymentMethod, boolean>;
        };

        if (ignore) return;

        if (data.countryConfig) {
          const methods = data.countryConfig.methods.filter((method) => data.paymentMethods?.[method.id] !== false);
          setCountryConfig({ ...data.countryConfig, methods, paymentMethods: data.paymentMethods });
          const nextDefaultMethod = methods[0]?.id;
          if (nextDefaultMethod) {
            setPaymentMethod(nextDefaultMethod);
          }
        }

        if (Array.isArray(data.supportedCountries) && data.supportedCountries.length > 0) {
          const currencies = data.supportedCountries.filter(
            (country) => country.currency === "BRL" || country.currency === "EUR" || country.currency === "USD",
          );
          setSupportedCurrencies(Array.from(new Map(currencies.map((country) => [country.currency, country])).values()));
        }

        if (data.rates) {
          setRatesByCurrency({
            BRL: Number.isFinite(data.rates.BRL) ? data.rates.BRL : 1,
            USD: Number.isFinite(data.rates.USD) ? data.rates.USD : FALLBACK_RATES.USD,
            EUR: Number.isFinite(data.rates.EUR) ? data.rates.EUR : FALLBACK_RATES.EUR,
          });
        }

        if (typeof data.cardGatewayFeePercent === "number" && Number.isFinite(data.cardGatewayFeePercent)) {
          setCardGatewayFeePercent(data.cardGatewayFeePercent);
        }
      } catch {
        if (!ignore) {
          setCountryConfig(DEFAULT_COUNTRY_CONFIG);
          setCardGatewayFeePercent(DEFAULT_CARD_GATEWAY_FEE_PERCENT);
        }
      } finally {
        if (!ignore) {
          setCountryLoading(false);
        }
      }
    };

    void loadCheckoutContext();

    return () => {
      ignore = true;
    };
  }, []);

  const goldConfig = getGoldConfigFor(fullGoldConfig, gameId, selectedServerId, selectedFaction);
  const selectedServer = servers.find((server) => server.id === selectedServerId);

  const serverSelected = !hasServerOptions || selectedServerId !== "";
  const factionSelected = !requiresFaction || selectedFaction !== "";
  const stepServerDone = serverSelected && factionSelected;

  const safeGoldAmount = Math.min(Math.max(goldAmount, goldConfig.minGold), goldConfig.maxGold);
  const stepAmountDone = stepServerDone && safeGoldAmount >= goldConfig.minGold;

  const stepDetailsDone =
    stepAmountDone && nickname.trim() !== "" && deliveryMethod.trim() !== "" && email.trim() !== "";
  const formReady = stepDetailsDone && paymentMethod.trim() !== "" && termsAccepted;
  const completedSteps = [stepServerDone, stepAmountDone, stepDetailsDone, formReady].filter(Boolean).length;

  const basePrice = (safeGoldAmount / 1000) * goldConfig.pricePerThousand;
  const partnerDiscount = currentUser && agentReferralCode.trim() ? basePrice * 0.1 : 0;
  const discountedBasePrice = Math.max(0, basePrice - partnerDiscount);
  const deliveryAdjustment = 0;
  const paymentAdjustment =
    paymentMethod === "card"
      ? discountedBasePrice * (cardGatewayFeePercent / 100)
      : 0;
  const finalPrice = Math.max(0, discountedBasePrice + deliveryAdjustment + paymentAdjustment);
  const selectedPayment = countryConfig.methods.find((method) => method.id === paymentMethod) ?? countryConfig.methods[0];
  const selectedCurrency = countryConfig.currency;
  const selectedLocale = countryConfig.locale;
  const usdToCurrencyRate = getUsdToCurrencyRate(selectedCurrency, ratesByCurrency);
  const finalPriceLocalized = finalPrice * usdToCurrencyRate;
  const basePriceLocalized = discountedBasePrice * usdToCurrencyRate;
  const partnerDiscountLocalized = partnerDiscount * usdToCurrencyRate;
  const paymentAdjustmentLocalized = paymentAdjustment * usdToCurrencyRate;
  const lootCoinAmount = Math.max(0, finalPrice);

  const progressPercent = useMemo(() => {
    let score = 0;
    if (stepServerDone) score += 25;
    if (stepAmountDone) score += 25;
    if (stepDetailsDone) score += 25;
    if (formReady) score += 25;
    return score;
  }, [formReady, stepAmountDone, stepDetailsDone, stepServerDone]);

  const startCheckout = async () => {
    if (!formReady || checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const idToken = currentUser ? await currentUser.getIdToken() : null;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          gameId,
          categoryId,
          goldAmount: safeGoldAmount,
          paymentMethod,
          country: countryConfig.countryName,
          countryCode: countryConfig.countryCode,
          locale: countryConfig.locale,
          currency: selectedCurrency,
          nickname: nickname.trim(),
          serverId: selectedServerId,
          faction: selectedFaction,
          deliveryMethod,
          email: email.trim(),
          agentReferralCode: agentReferralCode.trim(),
          termsAccepted,
        }),
      });

      const data = (await response.json()) as { url?: string; pix?: { paymentId: string }; error?: string };

      if (!response.ok || (!data.url && !data.pix?.paymentId)) {
        setCheckoutError(data.error ?? "Could not start checkout. Try again.");
        return;
      }

      window.location.href = data.url ?? `/checkout/pix?payment_id=${encodeURIComponent(data.pix?.paymentId ?? "")}`;
    } catch {
      setCheckoutError("Network error. Check your connection and try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onCurrencyChange = async (nextCurrency: CheckoutCurrency) => {
    setCountryLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch(`/api/checkout/context?currency=${nextCurrency}`);
      const data = (await response.json()) as {
        countryConfig?: CountryConfig;
        rates?: Record<string, number>;
        cardGatewayFeePercent?: number;
        paymentMethods?: Record<PaymentMethod, boolean>;
      };

      if (data.countryConfig) {
        const methods = data.countryConfig.methods.filter((method) => data.paymentMethods?.[method.id] !== false);
        setCountryConfig({ ...data.countryConfig, methods, paymentMethods: data.paymentMethods });
        const nextMethod = methods[0]?.id;
        if (nextMethod) {
          setPaymentMethod(nextMethod);
        }
      }

      if (data.rates) {
        setRatesByCurrency((current) => ({ ...current, ...data.rates }));
      }

      if (typeof data.cardGatewayFeePercent === "number" && Number.isFinite(data.cardGatewayFeePercent)) {
        setCardGatewayFeePercent(data.cardGatewayFeePercent);
      }
    } catch {
      setCheckoutError("Could not update country settings.");
    } finally {
      setCountryLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="gm-glass relative overflow-hidden rounded-[1.35rem] px-5 py-5 sm:px-6">
        <div className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_center,rgba(212,175,90,0.2),transparent_68%)]" />
        <Image src="/baus/epico.png" alt="Epic loot chest" width={144} height={144} className="pointer-events-none absolute right-3 top-1/2 h-28 w-28 -translate-y-1/2 object-contain opacity-75 sm:right-10 sm:h-36 sm:w-36" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/games/${gameId}`} className="gm-button gm-button-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.12em]">
              ← Back to categories
            </Link>
            <span className="gm-badge px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.14em]">{gameTitle.includes("TBC") ? "Progression" : "Gold"}</span>
            <span className="gm-badge px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.14em]">Gold</span>
          </div>
          <h1 className="font-throne mt-3 text-3xl font-black leading-none text-[#eaf4ff] sm:text-4xl">Gold Checkout</h1>
          <p className="mt-2 text-sm text-[#a8c3e0]">Complete your order in a few simple steps.</p>
          <p className="mt-3 text-sm font-semibold text-[#f6d27c]">Sign up and earn rewards every time you shop on our site.</p>
        </div>
      </header>

      <nav aria-label="Checkout progress" className="gm-panel grid grid-cols-3 gap-1 rounded-xl px-2 py-2">
        {[
          ["1", "Server & Faction", stepServerDone],
          ["2", "Gold & Payment", stepAmountDone],
          ["3", "Delivery Details", stepDetailsDone],
        ].map(([number, label, complete], index) => (
          <div key={String(number)} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[0.55rem] font-bold uppercase tracking-[0.1em] sm:px-4 ${complete ? "text-[#facc15]" : index === 0 ? "text-[#6ee7ff]" : "text-[#6f849d]"}`}>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[0.55rem]">{complete ? <Check className="size-3" /> : number}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </nav>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <article className="gm-panel rounded-[1.35rem] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#9ec4f4]">
            <Sword className="h-4 w-4" />
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]">Step 1: Server and faction</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
            <label htmlFor="currency-select" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
              Currency
            </label>
            <select
              id="currency-select"
              value={countryConfig.currency}
              disabled={countryLoading}
              onChange={(event) => void onCurrencyChange(event.target.value as CheckoutCurrency)}
              className="gm-select mt-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {supportedCurrencies.map((currency) => (
                <option key={currency.currency} value={currency.currency}>
                  {currency.currency}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#88a8d1]">
              {countryConfig.currency === "BRL"
                ? "Pagamentos em reais. Escolha Pix, Cartao ou Loot Coins."
                : countryConfig.currency === "EUR"
                  ? "Payments in euros, processed securely by Stripe or PayPal."
                  : "Payments in US dollars, processed securely by Stripe or PayPal."}
            </p>
            </div>
            <div>
              <label htmlFor="server-select" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
                Server
              </label>
              <select
                id="server-select"
                value={selectedServerId}
                disabled={!hasServerOptions}
                onChange={(event) => {
                  const nextServerId = event.target.value;
                  const nextConfig = getGoldConfigFor(fullGoldConfig, gameId, nextServerId, undefined);
                  setSelectedServerId(nextServerId);
                  setSelectedFaction("");
                  setGoldAmount(nextConfig.minGold);
                }}
                className="gm-select mt-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                <option value="">{hasServerOptions ? "Select a server" : "No server selection for this game"}</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name} ({server.region})
                  </option>
                ))}
              </select>
            </div>

            {requiresFaction ? (
              <div className="sm:col-span-2">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">Faction</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(selectedServer?.factions ?? ["Horde", "Alliance"]).map((faction) => (
                    <button
                      key={faction}
                      type="button"
                      disabled={!serverSelected}
                      onClick={() => {
                        setSelectedFaction(faction);
                        const nextConfig = getGoldConfigFor(fullGoldConfig, gameId, selectedServerId, faction);
                        setGoldAmount(nextConfig.minGold);
                      }}
                      className={`gm-button flex min-h-14 items-center justify-between rounded-xl border px-3 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                        selectedFaction === faction
                          ? faction === "Horde" ? "border-[#ef4444]/70 bg-[#3b1218]/70 text-[#fecaca]" : "border-[#60a5fa]/70 bg-[#102b4d]/70 text-[#bfdbfe]"
                          : "gm-button-secondary disabled:cursor-not-allowed"
                      }`}
                    >
                      <span className="flex items-center gap-2"><Swords className="size-4" />{faction}</span>
                      {selectedFaction === faction ? <Check className="size-4 text-[#facc15]" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="gm-panel rounded-[1.35rem] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#9ec4f4]">
            <Landmark className="h-4 w-4" />
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]">Step 2: Gold and payment</p>
          </div>

          <div className={`mt-4 space-y-4 ${stepServerDone ? "" : "opacity-45"}`}>
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">Gold amount</p>
                <span className="gm-badge px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em]">
                  {safeGoldAmount.toLocaleString()} gold
                </span>
              </div>

              <input
                type="range"
                min={goldConfig.minGold}
                max={goldConfig.maxGold}
                step={Math.max(1, goldConfig.minGold)}
                value={safeGoldAmount}
                disabled={!stepServerDone}
                onChange={(event) => setGoldAmount(Number(event.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#3ba8ff] disabled:cursor-not-allowed"
              />

              <div className="mt-2 flex justify-between text-xs text-[#88a8d1]">
                <span>{goldConfig.minGold.toLocaleString()}</span>
                <span>{goldConfig.maxGold.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {countryConfig.methods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  disabled={!stepAmountDone}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`gm-button rounded-xl border px-4 py-4 text-left transition-all disabled:cursor-not-allowed ${
                    paymentMethod === method.id
                      ? "border-[#6ee7ff]/35 bg-[#17345d]/75 shadow-[0_14px_28px_rgba(3,10,22,0.3)]"
                      : "border-white/10 bg-[#0e172c]/70 hover:border-white/18"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-black ${method.id === "pix" ? "text-[#86efac]" : method.id === "balance" ? "text-[#facc15]" : method.id === "paypal" ? "text-[#facc15]" : "text-[#93c5fd]"}`}>{method.label}</p>
                    {paymentMethod === method.id ? <Check className="size-4 text-[#facc15]" /> : null}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#a9c4e2]">{method.description}</p>
                  <span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-0.5 text-[0.48rem] font-bold uppercase tracking-[0.12em] text-[#c4d4e6]">
                    {method.id === "pix" ? "Recommended" : method.id === "balance" ? "Fast" : "Secure"}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="agent-referral-code" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
                Coupon or partner discount code (optional)
              </label>
              <input
                id="agent-referral-code"
                type="text"
                maxLength={20}
                value={agentReferralCode}
                disabled={!stepAmountDone || !currentUser}
                onChange={(event) => setAgentReferralCode(normalizeReferralCode(event.target.value))}
                placeholder={currentUser ? "COUPON OR AGENT CODE" : "LOG IN TO ENTER A CODE"}
                className="gm-input mt-2 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-[#88a8d1]">
                {currentUser
                  ? "Enter your coupon or agent code."
                  : "You must be logged in to enter a coupon or agent code."}
              </p>
              {!currentUser ? <Link href="/login" className="mt-2 inline-flex text-xs font-bold text-[#facc15] underline">Log in to enter a code</Link> : null}
            </div>
          </div>
        </article>

        <article className="gm-panel rounded-[1.35rem] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#9ec4f4]">
            <ScrollText className="h-4 w-4" />
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]">Step 3: Delivery details</p>
          </div>

          <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${stepAmountDone ? "" : "opacity-45"}`}>
            <div>
              <label htmlFor="nickname" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
                Nickname
              </label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7aa6d6]" />
                <input
                  id="nickname"
                  type="text"
                  maxLength={15}
                  value={nickname}
                  disabled={!stepAmountDone}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Your character name"
                  className="gm-input pl-10 pr-3 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="delivery-method" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
                Delivery method
              </label>
              <select
                id="delivery-method"
                value={deliveryMethod}
                disabled={!stepAmountDone}
                onChange={(event) => setDeliveryMethod(event.target.value)}
                className="gm-select mt-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {deliveryMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.value} · {method.feeLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
                Email
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7aa6d6]" />
                <input
                  id="email"
                  type="email"
                  maxLength={50}
                  value={email}
                  disabled={!stepAmountDone}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="gm-input pl-10 pr-3 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                />
              </div>
            </div>

          </div>
        </article>
      </div>

      <aside className="self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <article className="gm-panel rounded-[1.35rem] p-5">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">Order summary</p>
          <p className="mt-2 text-xs text-[#88a8d1]">Live preview of your checkout while you scroll.</p>

          <div className="mt-3 rounded-xl border border-white/10 bg-[#0b162b]/70 px-3 py-3">
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span className="text-xs uppercase tracking-[0.12em]">Progress</span>
              <span className="text-xs font-black text-[#6ee7ff]">{completedSteps}/4</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#3ba8ff_0%,#6ee7ff_65%,#22c55e_100%)] transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Currency</span>
              <span className="font-semibold text-[#e7f5ff]">{selectedCurrency}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Server</span>
              <span className="font-semibold text-[#e7f5ff]">{selectedServer?.name ?? "-"}</span>
            </div>
            {requiresFaction ? (
              <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
                <span>Faction</span>
                <span className="font-semibold text-[#e7f5ff]">{selectedFaction || "-"}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Gold</span>
              <span className="font-semibold text-[#e7f5ff]">{safeGoldAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Delivery</span>
              <span className="font-semibold text-[#e7f5ff]">{deliveryMethod || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Partner code</span>
              <span className="max-w-[10rem] truncate font-semibold text-[#e7f5ff]">{agentReferralCode.trim() || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Fee</span>
              <span className="font-semibold text-[#e7f5ff]">0% fee</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Character</span>
              <span className="max-w-[10rem] truncate font-semibold text-[#e7f5ff]">{nickname.trim() || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>Base</span>
              <span className="font-semibold text-[#e7f5ff]">{formatCurrency(basePriceLocalized, selectedCurrency, selectedLocale)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
              <span>{paymentMethod === "card" ? "Card fee" : "Payment fee"}</span>
              <span className={`font-semibold ${paymentAdjustment <= 0 ? "text-[#86efac]" : "text-[#fdba74]"}`}>
                {paymentAdjustment === 0
                  ? formatCurrency(0, selectedCurrency, selectedLocale)
                  : `${paymentAdjustment > 0 ? "+" : "-"}${formatCurrency(Math.abs(paymentAdjustmentLocalized), selectedCurrency, selectedLocale)}`}
              </span>
            </div>
            {paymentMethod === "card" ? (
              <div className="flex items-center justify-between gap-2 text-[#b9d2ec]">
                <span>Card rate</span>
                <span className="font-semibold text-[#e7f5ff]">+{cardGatewayFeePercent.toFixed(2)}%</span>
              </div>
            ) : null}
          </div>

          <div className="gm-divider my-4" />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#d3e9ff]">Total</p>
            <p className="text-2xl font-black text-[#6ee7ff]">{formatCurrency(finalPriceLocalized, selectedCurrency, selectedLocale)}</p>
          </div>
          {partnerDiscount > 0 ? <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#86efac]"><span>Partner discount (10%)</span><span>-{formatCurrency(partnerDiscountLocalized, selectedCurrency, selectedLocale)}</span></div> : null}
          <p className="mt-2 text-right text-xs font-semibold text-[#88a8d1]">Estimated delivery: up to 2 hours.</p>

          {paymentMethod === "balance" ? (
            <div className="mt-3 rounded-xl border border-[#facc15]/25 bg-[#3b2f0b]/35 px-3 py-3">
              <div className="flex items-center justify-between gap-3 text-[#f8e7a0]">
                <span className="text-xs uppercase tracking-[0.12em]">Loot Coins to debit</span>
                <span className="font-black text-[#facc15]">{lootCoinAmount.toFixed(2)} Loot Coins</span>
              </div>
              <p className="mt-1 text-xs text-[#d8c986]">
                1 Loot Coin = US$1.00 · equivalent to {formatCurrency(finalPriceLocalized, selectedCurrency, selectedLocale)}
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b162b]/75 px-3 py-3">
            <div className="flex items-center gap-2 text-[#9ec4f4]">
              {paymentMethod === "balance" ? <Coins className="h-4 w-4" /> : paymentMethod === "pix" ? <Landmark className="h-4 w-4" /> : paymentMethod === "card" ? <CreditCard className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]">Payment method</p>
            </div>
            <p className={`mt-2 text-sm font-black ${paymentMethod === "pix" ? "text-[#86efac]" : paymentMethod === "balance" ? "text-[#facc15]" : paymentMethod === "paypal" ? "text-[#facc15]" : "text-[#93c5fd]"}`}>
              {selectedPayment?.label ?? "Payment"}
            </p>
            <p className="mt-1 text-xs text-[#a9c4e2]">{selectedPayment?.description ?? ""}</p>
            <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#88a8d1]">Gateway: {selectedPayment?.provider ?? "Stripe"}</p>
          </div>

          {checkoutError ? (
            <p className="mt-4 rounded-xl border border-[#ff6060]/30 bg-[#2a1212]/70 px-3 py-3 text-xs font-semibold text-[#ffb4b4]">
              {checkoutError}
            </p>
          ) : null}

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-[#0b162b]/70 px-3 py-3 text-xs leading-5 text-[#b9d2ec]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-[#d4af5a]"
            />
            <span>
              I accept the <Link href="/terms" target="_blank" className="font-bold text-[#f6d27c] underline">Terms and Privacy</Link>.
            </span>
          </label>

          <button
            type="button"
            disabled={!formReady || checkoutLoading}
            onClick={() => void startCheckout()}
            className="gm-button gm-button-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoading ? "Redirecting..." : `Checkout ${formatCurrency(finalPriceLocalized, selectedCurrency, selectedLocale)}`}
          </button>
        </article>
      </aside>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        [ShieldCheck, "100% Safe", "Your data and payments are protected."],
        [Zap, "Instant Delivery", "Fast delivery to your character."],
        [Sparkles, "Best Prices", "Competitive prices and low fees."],
        [Headphones, "24/7 Support", "We're here to help you anytime."],
      ].map(([Icon, title, text]) => (
        <article key={String(title)} className="gm-panel flex items-center gap-3 rounded-xl px-3 py-3">
          <Icon className="size-4 shrink-0 text-[#d4af5a]" />
          <div className="min-w-0">
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-[#e6c46a]">{String(title)}</p>
            <p className="mt-1 text-[0.65rem] text-[#88a8d1]">{String(text)}</p>
          </div>
        </article>
      ))}
    </section>
    </div>
  );
}
