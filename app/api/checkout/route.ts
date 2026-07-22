import Stripe from "stripe";

import { defaultGoldConfigEntry } from "@/app/data/gold-config";
import { getServersByGameId } from "@/app/data/games";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";

type CheckoutBody = {
  gameId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  pricePerThousand: number;
  paymentMethod: "pix" | "card" | "paypal";
  paymentGateway?: "stripe" | "paypal";
  paymentProvider?: "Pix" | "Stripe" | "PayPal";
  country?: string;
  countryCode?: string;
  locale?: string;
  currency?: "BRL" | "USD" | "EUR" | "GBP";
  fxRateFromBrl?: number;
  nickname: string;
  serverId: string;
  server: string;
  faction: string;
  deliveryMethod: string;
  email: string;
  hasServerOptions: boolean;
  customerUid?: string;
};

function computeFinalAmount(price: number, paymentMethod: string, cardGatewayFeePercent: number): number {
  if (paymentMethod === "pix") return Math.round(price * 0.95 * 100);
  if (paymentMethod === "card") return Math.round(price * (1 + cardGatewayFeePercent / 100) * 100);
  if (paymentMethod === "paypal") return Math.round(price * 100);
  return Math.round(price * 100);
}

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  return fallback;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
}

function parseGoldConfigEntry(data: Record<string, unknown>) {
  const minGold = toPositiveInt(data.minGold, defaultGoldConfigEntry.minGold);
  const maxGold = toPositiveInt(data.maxGold, defaultGoldConfigEntry.maxGold);

  return {
    pricePerThousand: toPositiveNumber(data.pricePerThousand, defaultGoldConfigEntry.pricePerThousand),
    minGold,
    maxGold: Math.max(maxGold, minGold),
  };
}

function buildScopeKeys(gameId: string, serverId: string, faction: string) {
  const keys: string[] = [];

  if (serverId && faction) {
    keys.push(`${gameId}|${serverId}|${faction}`);
  }

  if (serverId) {
    keys.push(`${gameId}|${serverId}`);
  }

  keys.push(gameId);

  return keys;
}

async function resolvePricingConfig(gameId: string, serverId: string, faction: string) {
  const adminDb = getAdminDb();
  const scopeKeys = buildScopeKeys(gameId, serverId, faction);

  for (const key of scopeKeys) {
    const snapshot = await adminDb.collection("gold-config").doc(key).get();
    if (snapshot.exists) {
      return parseGoldConfigEntry(snapshot.data() as Record<string, unknown>);
    }
  }

  return defaultGoldConfigEntry;
}

async function resolveSiteFeeSettings() {
  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();

  if (!snapshot.exists) {
    return buildDefaultSiteFeeSettings();
  }

  return sanitizeSiteFeeSettings(snapshot.data());
}

export async function POST(request: Request): Promise<Response> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);

  let body: CheckoutBody;

  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    gameId,
    gameTitle,
    categoryTitle,
    goldAmount,
    paymentMethod,
    paymentGateway,
    paymentProvider,
    country,
    countryCode,
    locale,
    currency,
    fxRateFromBrl,
    nickname,
    serverId,
    server,
    faction,
    deliveryMethod,
    email,
    hasServerOptions,
    customerUid,
  } = body;

  const requiresFaction = hasServerOptions && gameId !== "retail";
  const missingFields = [
    !gameId?.trim() ? "gameId" : null,
    !gameTitle?.trim() ? "gameTitle" : null,
    !categoryTitle?.trim() ? "categoryTitle" : null,
    !Number.isFinite(goldAmount) || goldAmount <= 0 ? "goldAmount" : null,
    !email?.trim() ? "email" : null,
    !nickname?.trim() ? "nickname" : null,
    !deliveryMethod?.trim() ? "deliveryMethod" : null,
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return Response.json(
      { error: `Missing required fields: ${missingFields.join(", ")}.` },
      { status: 422 },
    );
  }

  if (hasServerOptions && (!serverId?.trim() || !server?.trim())) {
    return Response.json({ error: "Server is required for this game." }, { status: 422 });
  }

  if (requiresFaction && !faction?.trim()) {
    return Response.json({ error: "Faction is required for this game." }, { status: 422 });
  }

  const knownServers = getServersByGameId(gameId);
  const requiresServer = knownServers.length > 0;

  if (requiresServer && !serverId?.trim()) {
    return Response.json({ error: "Server is required for this game." }, { status: 422 });
  }

  const resolvedServer = knownServers.find((entry) => entry.id === serverId);
  if (requiresServer && !resolvedServer) {
    return Response.json({ error: "Invalid server for selected game." }, { status: 422 });
  }

  if (requiresServer && requiresFaction) {
    const knownFactions = resolvedServer?.factions ?? [];
    if (!knownFactions.includes(faction)) {
      return Response.json({ error: "Invalid faction for selected server." }, { status: 422 });
    }
  }

  let authoritativeConfig;
  let supplierDefaultPercent = buildDefaultSiteFeeSettings().supplierDefaultPercent;
  let cardGatewayFeePercent = buildDefaultSiteFeeSettings().cardGatewayFeePercent;
  let cashbackPercent = buildDefaultSiteFeeSettings().cashbackPercent;
  let operationalReservePercent = buildDefaultSiteFeeSettings().operationalReservePercent;

  try {
    authoritativeConfig = await resolvePricingConfig(
      gameId,
      serverId?.trim() ?? "",
      requiresFaction ? faction?.trim() ?? "" : "",
    );
  } catch {
    return Response.json({ error: "Could not load price configuration." }, { status: 503 });
  }

  try {
    const siteFeeSettings = await resolveSiteFeeSettings();
    supplierDefaultPercent = siteFeeSettings.supplierDefaultPercent;
    cardGatewayFeePercent = siteFeeSettings.cardGatewayFeePercent;
    cashbackPercent = siteFeeSettings.cashbackPercent;
    operationalReservePercent = siteFeeSettings.operationalReservePercent;
  } catch {
    const defaults = buildDefaultSiteFeeSettings();
    supplierDefaultPercent = defaults.supplierDefaultPercent;
    cardGatewayFeePercent = defaults.cardGatewayFeePercent;
    cashbackPercent = defaults.cashbackPercent;
    operationalReservePercent = defaults.operationalReservePercent;
  }

  const validatedGoldAmount = Math.min(
    Math.max(Math.round(goldAmount), authoritativeConfig.minGold),
    authoritativeConfig.maxGold,
  );

  if (validatedGoldAmount !== Math.round(goldAmount)) {
    return Response.json({ error: "Gold amount is outside allowed range." }, { status: 422 });
  }

  const basePrice = (validatedGoldAmount / 1000) * authoritativeConfig.pricePerThousand;
  const baseAmountCents = Math.round(basePrice * 100);
  const unitAmountBrl = computeFinalAmount(basePrice, paymentMethod, cardGatewayFeePercent);

  const normalizedCurrency = (currency ?? "BRL").toLowerCase();
  const selectedCurrency = ["brl", "usd", "eur", "gbp"].includes(normalizedCurrency) ? normalizedCurrency : "brl";
  const parsedFxRate = typeof fxRateFromBrl === "number" && Number.isFinite(fxRateFromBrl) && fxRateFromBrl > 0
    ? fxRateFromBrl
    : 1;

  const unitAmount = selectedCurrency === "brl"
    ? unitAmountBrl
    : Math.max(1, Math.round(unitAmountBrl * parsedFxRate));

  if (unitAmount <= 0) {
    return Response.json({ error: "Invalid price." }, { status: 422 });
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const paymentMethodTypes = (
    paymentMethod === "pix" ? ["pix"] : paymentMethod === "paypal" ? ["paypal"] : ["card"]
  ) as unknown as Stripe.Checkout.SessionCreateParams["payment_method_types"];

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";

  const metadata = {
    gameId,
    gameTitle,
    categoryTitle,
    goldAmount: String(validatedGoldAmount),
    pricePerThousand: String(authoritativeConfig.pricePerThousand),
    baseAmountCents: String(baseAmountCents),
    finalAmountCents: String(unitAmount),
    serverId,
    server,
    faction,
    deliveryMethod,
    nickname,
    paymentMethod,
    paymentGateway: paymentGateway ?? (paymentMethod === "paypal" ? "paypal" : "stripe"),
    paymentProvider: paymentProvider ?? (paymentMethod === "pix" ? "Pix" : paymentMethod === "paypal" ? "PayPal" : "Stripe"),
    country: country ?? "",
    countryCode: countryCode ?? "",
    locale: locale ?? "",
    currency: selectedCurrency.toUpperCase(),
    clientIp,
    hasServerOptions: String(hasServerOptions),
    customerUid: customerUid?.trim() ?? "",
    supplierPercentage: String(supplierDefaultPercent),
    // Keep legacy field for compatibility with historical flows.
    commissionPercent: String(100 - supplierDefaultPercent),
    cardGatewayFeePercent: String(cardGatewayFeePercent),
    cashbackPercent: String(cashbackPercent),
    operationalReservePercent: String(operationalReservePercent),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      customer_email: email,
      metadata,
      payment_intent_data: {
        metadata,
      },
      line_items: [
        {
          price_data: {
            currency: selectedCurrency,
            unit_amount: unitAmount,
            product_data: {
              name: `${goldAmount.toLocaleString("pt-BR")} gold — ${gameTitle} / ${categoryTitle}`,
              description: [
                server && `Server: ${server}`,
                faction && `Faction: ${faction}`,
                `Delivery: ${deliveryMethod}`,
                `Character: ${nickname}`,
                paymentMethod === "pix" ? "Pix discount applied (5%)" : null,
                paymentMethod === "card" ? `Card gateway fee applied (${cardGatewayFeePercent.toFixed(2)}%)` : null,
                paymentMethod === "paypal" ? "PayPal checkout" : null,
              ]
                .filter(Boolean)
                .join(" | "),
              metadata: {
                ...metadata,
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe session creation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
