import Stripe from "stripe";

import { defaultGoldConfigEntry } from "@/app/data/gold-config";
import { getServersByGameId } from "@/app/data/games";
import { normalizeAgentCode } from "@/lib/agency";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { resolveDiscordChannelId } from "@/lib/discord-channel-resolver";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";
import { getUsdToCurrencyRate } from "@/lib/checkout-pricing";

type CheckoutBody = {
  gameId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  pricePerThousand: number;
  paymentMethod: "pix" | "card" | "paypal" | "balance";
  paymentGateway?: "stripe" | "paypal" | "internal";
  paymentProvider?: "Pix" | "Stripe" | "PayPal" | "Loot Coins";
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
  agentReferralCode?: string;
  hasServerOptions: boolean;
  customerUid?: string;
};

function computePricingBreakdown(
  price: number,
  paymentMethod: string,
  deliveryMethod: string,
  cardGatewayFeePercent: number,
): {
  baseProductCents: number;
  deliverySurchargeCents: number;
  paymentSurchargeCents: number;
  chargedTotalCents: number;
} {
  const safePrice = Math.max(0, price);
  const normalizedDeliveryMethod = deliveryMethod.trim().toLowerCase();
  const deliveryAdjustment = normalizedDeliveryMethod === "auction house" ? safePrice * 0.02 : 0;
  const paymentAdjustment =
    paymentMethod === "card"
      ? safePrice * (cardGatewayFeePercent / 100)
      : 0;

  const finalPrice = Math.max(0, safePrice + deliveryAdjustment + paymentAdjustment);

  return {
    baseProductCents: Math.round(safePrice * 100),
    deliverySurchargeCents: Math.round(deliveryAdjustment * 100),
    paymentSurchargeCents: Math.round(paymentAdjustment * 100),
    chargedTotalCents: Math.round(finalPrice * 100),
  };
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
    agentReferralCode,
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

  const allowedDeliveryMethods = new Set(["Face to face", "Mailbox"]);
  if (!allowedDeliveryMethods.has(deliveryMethod.trim())) {
    return Response.json({ error: "Selected delivery method is not available right now." }, { status: 422 });
  }

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
  const pricingBreakdown = computePricingBreakdown(basePrice, paymentMethod, deliveryMethod, cardGatewayFeePercent);
  const unitAmountBrl = pricingBreakdown.chargedTotalCents;

  const normalizedCurrency = (currency ?? "USD").toLowerCase();
  const selectedCurrency = ["brl", "usd", "eur", "gbp"].includes(normalizedCurrency) ? normalizedCurrency : "usd";
  const parsedFxRate = typeof fxRateFromBrl === "number" && Number.isFinite(fxRateFromBrl) && fxRateFromBrl > 0
    ? fxRateFromBrl
    : 1;

  const usdToCurrencyRate = getUsdToCurrencyRate(selectedCurrency.toUpperCase(), {
    USD: 1,
    BRL: selectedCurrency === "brl" ? parsedFxRate : 1,
    EUR: selectedCurrency === "eur" ? parsedFxRate : 1,
    GBP: selectedCurrency === "gbp" ? parsedFxRate : 1,
  });

  const unitAmount = Math.max(1, Math.round(unitAmountBrl * usdToCurrencyRate));

  if (unitAmount <= 0) {
    return Response.json({ error: "Invalid price." }, { status: 422 });
  }

  if (paymentMethod === "balance") {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";

    if (!token) {
      return Response.json({ error: "Sign in to pay with Loot Coins." }, { status: 401 });
    }

    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      const orderId = `lootcoin_${Date.now()}_${decodedToken.uid.slice(-8)}`;
      const amountUsdCents = pricingBreakdown.chargedTotalCents;
      const supplierPercentage = supplierDefaultPercent;
      const supplierPayout = Math.round(pricingBreakdown.baseProductCents * (supplierPercentage / 100));
      const grossProfit = Math.max(0, amountUsdCents - supplierPayout);
      const adminDb = getAdminDb();

      await adminDb.runTransaction(async (transaction) => {
        const userRef = adminDb.collection("users").doc(decodedToken.uid);
        const orderRef = adminDb.collection("order-checkouts").doc(orderId);
        const userSnapshot = await transaction.get(userRef);
        const userData = userSnapshot.exists ? (userSnapshot.data() as Record<string, unknown>) : {};
        const currentLootCoins = typeof userData.lootCoins === "number" && Number.isFinite(userData.lootCoins)
          ? userData.lootCoins
          : 0;

        if (currentLootCoins < amountUsdCents / 100) {
          throw new Error("Insufficient Loot Coins balance.");
        }

        transaction.set(userRef, {
          lootCoins: Math.round((currentLootCoins - amountUsdCents / 100) * 100) / 100,
          lootCoinsSpent: (typeof userData.lootCoinsSpent === "number" ? userData.lootCoinsSpent : 0) + amountUsdCents / 100,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        transaction.set(orderRef, {
          orderId,
          paymentStatus: "paid",
          orderStatus: "paid",
          amountTotalCents: amountUsdCents,
          currency: "usd",
          customerEmail: email.trim(),
          customerUid: decodedToken.uid,
          gameId,
          gameTitle,
          categoryTitle,
          goldAmount: validatedGoldAmount,
          pricePerThousand: authoritativeConfig.pricePerThousand,
          baseProductCents: pricingBreakdown.baseProductCents,
          finalAmountCents: amountUsdCents,
          serverId,
          server,
          faction,
          deliveryMethod,
          nickname: nickname.trim(),
          paymentMethod: "balance",
          paymentGateway: "internal",
          paymentProvider: "Loot Coins",
          supplierPercentage,
          grossRevenue: amountUsdCents,
          supplierPayout,
          grossProfit,
          netProfit: grossProfit,
          sellerAmountCents: supplierPayout,
          platformProfitCents: grossProfit,
          stripeCreatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      try {
        const notification = await sendOrderNotificationViaBot({
          gameId,
          channelId: await resolveDiscordChannelId(gameId, "gold"),
          sessionId: orderId,
          gameTitle,
          categoryTitle,
          goldAmount: String(validatedGoldAmount),
          serverId,
          server,
          faction,
          nickname: nickname.trim(),
          paymentMethod: "balance",
          finalAmountCents: String(amountUsdCents),
          supplierPayoutCents: String(supplierPayout),
          currency: "USD",
          email: email.trim(),
        });

        if (notification) {
          await adminDb.collection("order-checkouts").doc(orderId).set(
            {
              discordNotificationChannelId: notification.channelId,
              discordNotificationMessageId: notification.messageId,
            },
            { merge: true },
          );
        }
      } catch (error) {
        console.error("[Loot Coins Checkout] Could not send Discord notification:", error);
      }

      return Response.json({ url: `/checkout/success?session_id=${orderId}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete Loot Coins payment.";
      const status = message.includes("Insufficient") ? 422 : message.includes("Firebase") ? 503 : 500;
      return Response.json({ error: message }, { status });
    }
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);

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
    baseProductCents: String(pricingBreakdown.baseProductCents),
    deliverySurchargeCents: String(pricingBreakdown.deliverySurchargeCents),
    paymentSurchargeCents: String(pricingBreakdown.paymentSurchargeCents),
    chargedTotalCents: String(pricingBreakdown.chargedTotalCents),
    // Legacy compatibility fields
    baseAmountCents: String(pricingBreakdown.baseProductCents),
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
    agentReferralCode: normalizeAgentCode(agentReferralCode),
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
