"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Banknote, CreditCard, Landmark, Mail, ScrollText, Sword, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { defaultGoldConfigEntry, emptyGoldConfig, getGoldConfigFor } from "../data/gold-config";
import type { GameServer } from "../data/games";
import { subscribeToGoldConfig } from "../../lib/gold-config";
import { auth } from "../../lib/firebase";
import { getUsdToCurrencyRate } from "../../lib/checkout-pricing";

type GoldPurchaseMenuProps = {
  gameId: string;
  gameTitle: string;
  categoryTitle: string;
  servers: GameServer[];
};

type PaymentMethod = "pix" | "card" | "paypal";

type CheckoutPaymentMethod = {
  id: PaymentMethod;
  label: string;
  description: string;
  gateway: "stripe" | "paypal";
  provider: "Pix" | "Stripe" | "PayPal";
};

type CountryConfig = {
  countryCode: string;
  countryName: string;
  locale: string;
  currency: "BRL" | "USD" | "EUR" | "GBP";
  methods: CheckoutPaymentMethod[];
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
  ],
};

const FALLBACK_RATES: Record<string, number> = {
  BRL: 1,
  USD: 0.18,
  EUR: 0.16,
  GBP: 0.14,
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

export function GoldPurchaseMenu({ gameId, gameTitle, categoryTitle, servers }: GoldPurchaseMenuProps) {
  const searchParams = useSearchParams();
  const [fullGoldConfig, setFullGoldConfig] = useState(emptyGoldConfig);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [goldAmount, setGoldAmount] = useState(defaultGoldConfigEntry.minGold);
  const [nickname, setNickname] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState(deliveryMethods[0].value);
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [customerUid, setCustomerUid] = useState("");
  const [countryConfig, setCountryConfig] = useState<CountryConfig>(DEFAULT_COUNTRY_CONFIG);
  const [supportedCountries, setSupportedCountries] = useState<CountryConfig[]>([DEFAULT_COUNTRY_CONFIG]);
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
      setCustomerUid(user?.uid ?? "");

      if (user?.email) {
        setEmail((current) => (current.trim() ? current : user.email ?? current));
      }
    });
  }, []);

  useEffect(() => {
    const nextCode = normalizeReferralCode(
      searchParams.get("agent") ??
        searchParams.get("ref") ??
        searchParams.get("refId") ??
        searchParams.get("agentId") ??
        searchParams.get("agent_id"),
    );

    if (nextCode) {
      setAgentReferralCode((current) => (current.trim() ? current : nextCode));
    }
  }, [searchParams]);

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
        };

        if (ignore) return;

        if (data.countryConfig) {
          setCountryConfig(data.countryConfig);
          const nextDefaultMethod = data.countryConfig.methods[0]?.id;
          if (nextDefaultMethod) {
            setPaymentMethod(nextDefaultMethod);
          }
        }

        if (Array.isArray(data.supportedCountries) && data.supportedCountries.length > 0) {
          setSupportedCountries(data.supportedCountries);
        }

        if (data.rates) {
          setRatesByCurrency({
            BRL: Number.isFinite(data.rates.BRL) ? data.rates.BRL : 1,
            USD: Number.isFinite(data.rates.USD) ? data.rates.USD : FALLBACK_RATES.USD,
            EUR: Number.isFinite(data.rates.EUR) ? data.rates.EUR : FALLBACK_RATES.EUR,
            GBP: Number.isFinite(data.rates.GBP) ? data.rates.GBP : FALLBACK_RATES.GBP,
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
  const formReady = stepDetailsDone && paymentMethod.trim() !== "";
  const completedSteps = [stepServerDone, stepAmountDone, stepDetailsDone, formReady].filter(Boolean).length;

  const basePrice = (safeGoldAmount / 1000) * goldConfig.pricePerThousand;
  const deliveryAdjustment = 0;
  const paymentAdjustment =
    paymentMethod === "pix"
      ? basePrice * -0.05
      : paymentMethod === "card"
      ? basePrice * (cardGatewayFeePercent / 100)
      : 0;
  const finalPrice = Math.max(0, basePrice + deliveryAdjustment + paymentAdjustment);
  const selectedPayment = countryConfig.methods.find((method) => method.id === paymentMethod) ?? countryConfig.methods[0];
  const selectedCurrency = countryConfig.currency;
  const selectedLocale = countryConfig.locale;
  const usdToCurrencyRate = getUsdToCurrencyRate(selectedCurrency, ratesByCurrency);
  const finalPriceLocalized = finalPrice * usdToCurrencyRate;
  const basePriceLocalized = basePrice * usdToCurrencyRate;
  const paymentAdjustmentLocalized = paymentAdjustment * usdToCurrencyRate;

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
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          gameTitle,
          categoryTitle,
          goldAmount: safeGoldAmount,
          pricePerThousand: goldConfig.pricePerThousand,
          paymentMethod,
          country: countryConfig.countryName,
          countryCode: countryConfig.countryCode,
          locale: countryConfig.locale,
          currency: selectedCurrency,
          paymentGateway: selectedPayment?.gateway ?? "stripe",
          paymentProvider: selectedPayment?.provider ?? "Stripe",
          fxRateFromBrl: usdToCurrencyRate,
          nickname: nickname.trim(),
          serverId: selectedServerId,
          server: selectedServer?.name ?? "",
          faction: selectedFaction,
          deliveryMethod,
          email: email.trim(),
          agentReferralCode: agentReferralCode.trim(),
          hasServerOptions,
          customerUid,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setCheckoutError(data.error ?? "Could not start checkout. Try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setCheckoutError("Network error. Check your connection and try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onCountryChange = async (nextCountryCode: string) => {
    setCountryLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch(`/api/checkout/context?countryCode=${nextCountryCode}`);
      const data = (await response.json()) as {
        countryConfig?: CountryConfig;
        rates?: Record<string, number>;
        cardGatewayFeePercent?: number;
      };

      if (data.countryConfig) {
        setCountryConfig(data.countryConfig);
        const nextMethod = data.countryConfig.methods[0]?.id;
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
    <section className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <article className="gm-panel rounded-[1.35rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#95b8e2]">Order flow</p>
              <h2 className="mt-2 text-2xl font-black text-[#eaf4ff]">Configure your gold order</h2>
              <p className="mt-2 text-sm text-[#a8c3e0]">
                {gameTitle} / {categoryTitle}
              </p>
            </div>
            <span className="gm-badge px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.15em]">{progressPercent}% ready</span>
          </div>

          <div className="mt-4 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#3ba8ff_0%,#6ee7ff_65%,#22c55e_100%)] transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </article>

        <article className="gm-panel rounded-[1.35rem] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#9ec4f4]">
            <Sword className="h-4 w-4" />
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]">Step 1: Server and faction</p>
          </div>

          <div className="mt-4">
            <label htmlFor="country-select" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
              Country
            </label>
            <select
              id="country-select"
              value={countryConfig.countryCode}
              disabled={countryLoading}
              onChange={(event) => void onCountryChange(event.target.value)}
              className="gm-select mt-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {supportedCountries.map((country) => (
                <option key={country.countryCode} value={country.countryCode}>
                  {country.countryName}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#88a8d1]">
              {countryConfig.countryCode === "BR"
                ? "Pagamentos em reais (BRL). Escolha Pix ou Cartao."
                : "Payments processed securely by Stripe or PayPal."}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
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
                <div className="mt-2 flex flex-wrap gap-2">
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
                      className={`gm-button rounded-lg px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                        selectedFaction === faction
                          ? "gm-button-primary"
                          : "gm-button-secondary disabled:cursor-not-allowed"
                      }`}
                    >
                      {faction}
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
                  <p className={`text-sm font-black ${method.id === "pix" ? "text-[#86efac]" : method.id === "paypal" ? "text-[#facc15]" : "text-[#93c5fd]"}`}>{method.label}</p>
                  <p className="mt-2 text-xs leading-6 text-[#a9c4e2]">{method.description}</p>
                </button>
              ))}
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
                  value={email}
                  disabled={!stepAmountDone}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="gm-input pl-10 pr-3 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="agent-referral-code" className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#95b8e2]">
                Agent referral code (optional)
              </label>
              <div className="relative mt-2">
                <input
                  id="agent-referral-code"
                  type="text"
                  value={agentReferralCode}
                  disabled={!stepAmountDone}
                  onChange={(event) => setAgentReferralCode(normalizeReferralCode(event.target.value))}
                  placeholder="AGENT123"
                  className="gm-input px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:cursor-not-allowed"
                />
              </div>
              <p className="mt-2 text-xs text-[#88a8d1]">
                Enter the agent code here on the client&apos;s first completed purchase to bind the account automatically.
              </p>
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
              <span>Country</span>
              <span className="font-semibold text-[#e7f5ff]">{countryConfig.countryName}</span>
            </div>
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
              <span>Agent code</span>
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
              <span>{paymentMethod === "pix" ? "Pix discount" : paymentMethod === "card" ? "Card fee" : "PayPal fee"}</span>
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

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b162b]/75 px-3 py-3">
            <div className="flex items-center gap-2 text-[#9ec4f4]">
              {paymentMethod === "pix" ? <Landmark className="h-4 w-4" /> : paymentMethod === "card" ? <CreditCard className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]">Payment method</p>
            </div>
            <p className={`mt-2 text-sm font-black ${paymentMethod === "pix" ? "text-[#86efac]" : paymentMethod === "paypal" ? "text-[#facc15]" : "text-[#93c5fd]"}`}>
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
  );
}
