import Stripe from "stripe";

import { defaultGoldConfigEntry } from "@/app/data/gold-config";
import { getGameById, getServiceCategoryById, getServersByGameId } from "@/app/data/games";
import { computeFeeBreakdown, normalizeAgentCode } from "@/lib/agency";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { resolveDiscordChannelId } from "@/lib/discord-channel-resolver";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  GAME_CONFIGURATION_COLLECTION,
  GAME_CONFIGURATION_DOC_ID,
  canAccessCategory,
  sanitizeGameConfiguration,
} from "@/lib/game-configuration";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";
import { getUsdToCurrencyRate } from "@/lib/checkout-pricing";
import { createMercadoPagoPixPayment } from "@/lib/mercadopago";

type CheckoutBody = {
  gameId?: unknown;
  categoryId?: unknown;
  goldAmount: number;
  paymentMethod?: unknown;
  country?: string;
  countryCode?: string;
  locale?: string;
  currency?: "BRL" | "USD" | "EUR";
  nickname?: unknown;
  serverId?: unknown;
  faction?: unknown;
  deliveryMethod?: unknown;
  email?: unknown;
  agentReferralCode?: unknown;
  termsAccepted?: unknown;
};

type ExchangeRatePayload = {
  rates?: Record<string, unknown>;
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
  const deliveryAdjustment = 0;
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

  return null;
}

async function isCheckoutCategoryEnabled(gameId: string, categoryId: string): Promise<boolean> {
  try {
    const snapshot = await getAdminDb()
      .collection(GAME_CONFIGURATION_COLLECTION)
      .doc(GAME_CONFIGURATION_DOC_ID)
      .get();

    if (!snapshot.exists) {
      return false;
    }

    return canAccessCategory(sanitizeGameConfiguration(snapshot.data()), gameId, categoryId, false);
  } catch {
    return false;
  }
}

async function resolveSiteFeeSettings() {
  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();

  if (!snapshot.exists) {
    return buildDefaultSiteFeeSettings();
  }

  return sanitizeSiteFeeSettings(snapshot.data());
}

async function resolveServerRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/BRL", {
      next: { revalidate: 300 },
    });
    const payload = (await response.json()) as ExchangeRatePayload;
    const rates = payload.rates ?? {};
    return {
      BRL: 1,
      USD: typeof rates.USD === "number" && Number.isFinite(rates.USD) ? rates.USD : 0.18,
      EUR: typeof rates.EUR === "number" && Number.isFinite(rates.EUR) ? rates.EUR : 0.16,
    };
  } catch {
    return { BRL: 1, USD: 0.18, EUR: 0.16 };
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: CheckoutBody;

  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    gameId: rawGameId,
    categoryId: rawCategoryId,
    goldAmount,
    paymentMethod: rawPaymentMethod,
    country,
    countryCode,
    locale,
    currency,
    nickname: rawNickname,
    serverId: rawServerId,
    faction: rawFaction,
    deliveryMethod: rawDeliveryMethod,
    email: rawEmail,
    agentReferralCode: rawAgentReferralCode,
    termsAccepted: rawTermsAccepted,
  } = body;

  const gameId = typeof rawGameId === "string" ? rawGameId.trim() : "";
  const categoryId = typeof rawCategoryId === "string" ? rawCategoryId.trim() : "";
  const paymentMethod = typeof rawPaymentMethod === "string" ? rawPaymentMethod.trim() : "";
  const serverId = typeof rawServerId === "string" ? rawServerId.trim() : "";
  const faction = typeof rawFaction === "string" ? rawFaction.trim() : "";
  const deliveryMethod = typeof rawDeliveryMethod === "string" ? rawDeliveryMethod.trim() : "";
  const nickname = typeof rawNickname === "string" ? rawNickname.trim() : "";
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const agentReferralCode = typeof rawAgentReferralCode === "string" ? rawAgentReferralCode.trim() : "";
  const termsAccepted = rawTermsAccepted === true;
  const game = getGameById(gameId);
  const category = getServiceCategoryById(categoryId);
  const knownServers = getServersByGameId(gameId);
  const hasServerOptions = knownServers.length > 0;
  const requiresFaction = hasServerOptions && gameId !== "retail";
  const resolvedServer = knownServers.find((entry) => entry.id === serverId);
  const gameTitle = game?.title ?? "";
  const categoryTitle = category?.title ?? "";
  const server = resolvedServer?.name ?? "";
  const missingFields = [
    !gameId ? "gameId" : null,
    !categoryId ? "categoryId" : null,
    !Number.isFinite(goldAmount) || goldAmount <= 0 ? "goldAmount" : null,
    !email ? "email" : null,
    !nickname ? "nickname" : null,
    !deliveryMethod ? "deliveryMethod" : null,
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return Response.json(
      { error: `Missing required fields: ${missingFields.join(", ")}.` },
      { status: 422 },
    );
  }

  if (!termsAccepted) {
    return Response.json({ error: "You must accept the Terms and Privacy before checkout." }, { status: 422 });
  }

  if (!game || !category || category.id !== "gold") {
    return Response.json({ error: "Invalid game or service category." }, { status: 422 });
  }

  if (!(await isCheckoutCategoryEnabled(gameId, categoryId))) {
    return Response.json({ error: "This service is currently unavailable." }, { status: 403 });
  }

  if (!(paymentMethod === "pix" || paymentMethod === "card" || paymentMethod === "paypal" || paymentMethod === "balance")) {
    return Response.json({ error: "Invalid payment method." }, { status: 422 });
  }

  const textFields: Array<[string, unknown, number]> = [
    ["gameId", gameId, 80],
    ["categoryId", categoryId, 40],
    ["nickname", nickname, 15],
    ["email", email, 50],
    ["serverId", serverId, 80],
    ["faction", faction, 80],
    ["agentReferralCode", agentReferralCode, 20],
  ];
  if (textFields.some(([, value, maxLength]) => typeof value !== "string" || value.trim().length > maxLength)) {
    return Response.json({ error: "One or more fields are invalid." }, { status: 422 });
  }

  if (hasServerOptions && (!serverId || !resolvedServer)) {
    return Response.json({ error: "Server is required for this game." }, { status: 422 });
  }

  if (requiresFaction && !faction?.trim()) {
    return Response.json({ error: "Faction is required for this game." }, { status: 422 });
  }

  const requiresServer = hasServerOptions;

  const allowedDeliveryMethods = new Set(["Face to face", "Mailbox"]);
  if (!allowedDeliveryMethods.has(deliveryMethod.trim())) {
    return Response.json({ error: "Selected delivery method is not available right now." }, { status: 422 });
  }

  if (requiresServer && !serverId?.trim()) {
    return Response.json({ error: "Server is required for this game." }, { status: 422 });
  }

  if (requiresServer && requiresFaction) {
    const knownFactions = resolvedServer?.factions ?? [];
    if (!knownFactions.includes(faction)) {
      return Response.json({ error: "Invalid faction for selected server." }, { status: 422 });
    }
  }

  let customerUid = "";
  let partnerUid = "";
  let partnerFeeSharePercent = 0;
  if (agentReferralCode) {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    if (!token) {
      return Response.json({ error: "Log in with Discord before using a partner code." }, { status: 401 });
    }

    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token, true);
      customerUid = decodedToken.uid;
      const customerDoc = await getAdminDb().collection("users").doc(customerUid).get();
      const customerData = customerDoc.data() as Record<string, unknown> | undefined;
      if (customerData?.isAgent === true) {
        return Response.json({ error: "Partners cannot use partner discount codes." }, { status: 422 });
      }
      const usedLegacyPartnerCode = typeof customerData?.assignedByReferralCode === "string" && customerData.assignedByReferralCode.trim();
      if (customerData?.partnerDiscountUsed === true || customerData?.partnerDiscountCodeUsed === true || usedLegacyPartnerCode) {
        return Response.json({ error: "Partner discount codes are available only on the first purchase. Use a regular coupon instead." }, { status: 422 });
      }

      const recordedSpent = typeof customerData?.totalSpentCents === "number" && Number.isFinite(customerData.totalSpentCents)
        ? customerData.totalSpentCents
        : 0;
      const customerOrders = await getAdminDb()
        .collection("order-checkouts")
        .where("customerUid", "==", customerUid)
        .limit(25)
        .get();
      const hasPaidOrder = customerOrders.docs.some((order) => {
        const orderData = order.data() as Record<string, unknown>;
        return orderData.paymentStatus === "paid" || orderData.orderStatus === "paid" || orderData.orderStatus === "completed";
      });
      const verifiedEmail = typeof customerData?.email === "string" ? customerData.email.trim().toLowerCase() : "";
      const emailOrders = verifiedEmail
        ? await getAdminDb().collection("order-checkouts").where("customerEmail", "==", verifiedEmail).limit(25).get()
        : null;
      const hasPaidEmailOrder = emailOrders?.docs.some((order) => {
        const orderData = order.data() as Record<string, unknown>;
        return orderData.paymentStatus === "paid" || orderData.orderStatus === "paid" || orderData.orderStatus === "completed";
      }) ?? false;
      if (recordedSpent > 0 || hasPaidOrder || hasPaidEmailOrder) {
        return Response.json({ error: "Partner discount codes are available only on the first purchase. Use a regular coupon instead." }, { status: 422 });
      }

      const partnerSnapshot = await getAdminDb()
        .collection("users")
        .where("agentReferralCode", "==", agentReferralCode.toUpperCase())
        .where("isAgent", "==", true)
        .limit(1)
        .get();
      if (partnerSnapshot.empty || partnerSnapshot.docs[0]?.id === customerUid) {
        return Response.json({ error: "Partner discount code not found." }, { status: 422 });
      }
      partnerUid = partnerSnapshot.docs[0].id;
      const partnerData = partnerSnapshot.docs[0].data() as Record<string, unknown>;
      partnerFeeSharePercent = typeof partnerData.agentFeeSharePercent === "number" && Number.isFinite(partnerData.agentFeeSharePercent)
        ? partnerData.agentFeeSharePercent
        : 50;
    } catch {
      return Response.json({ error: "Your Discord session is invalid. Log in again before using a partner code." }, { status: 401 });
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
    if (!authoritativeConfig) {
      return Response.json({ error: "Price configuration is unavailable." }, { status: 503 });
    }
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
  const partnerDiscount = agentReferralCode ? basePrice * 0.1 : 0;
  const discountedBasePrice = Math.max(0, basePrice - partnerDiscount);
  const pricingBreakdown = computePricingBreakdown(discountedBasePrice, paymentMethod, deliveryMethod, cardGatewayFeePercent);
  const unitAmountBrl = pricingBreakdown.chargedTotalCents;

  const normalizedCurrency = (currency ?? "USD").toLowerCase();
  if (!(normalizedCurrency === "brl" || normalizedCurrency === "usd" || normalizedCurrency === "eur")) {
    return Response.json({ error: "Invalid currency." }, { status: 422 });
  }

  const selectedCurrency = normalizedCurrency;
  if (paymentMethod === "pix" && selectedCurrency !== "brl") {
    return Response.json({ error: "PIX payments must use BRL currency." }, { status: 422 });
  }

  const serverRates = await resolveServerRates();
  const usdToCurrencyRate = getUsdToCurrencyRate(selectedCurrency.toUpperCase(), serverRates);

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
      const commissionPercent = Math.max(0, 100 - supplierPercentage);
      const feeBreakdown = computeFeeBreakdown(pricingBreakdown.baseProductCents, commissionPercent, partnerUid ? partnerFeeSharePercent : 0);
      const partnerDiscountPartnerCents = Math.round(basePrice * 0.05 * 100);
      const partnerDiscountLootMasterCents = Math.round(basePrice * 0.05 * 100);
      const agentPayoutCents = Math.max(0, feeBreakdown.agentPayoutCents - partnerDiscountPartnerCents);
      const lootmasterFeeCents = Math.max(0, feeBreakdown.lootmasterFeeCents - partnerDiscountLootMasterCents);
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
          ...(agentReferralCode ? {
            assignedAgentId: partnerUid,
            assignedByReferralCode: normalizeAgentCode(agentReferralCode),
            partnerDiscountUsed: true,
            partnerDiscountCodeUsed: normalizeAgentCode(agentReferralCode),
            partnerDiscountUsedAt: new Date().toISOString(),
          } : {}),
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
          assignedAgentId: partnerUid,
          agentReferralCode: normalizeAgentCode(agentReferralCode),
          partnerDiscountCents: Math.round(partnerDiscount * 100),
          partnerDiscountPartnerCents,
          partnerDiscountLootMasterCents,
          platformFeeCents: agentPayoutCents + lootmasterFeeCents,
          agentPayoutCents,
          agentFeeSharePercent: partnerUid ? partnerFeeSharePercent : 0,
          lootmasterFeeCents,
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
        if (partnerUid) {
          transaction.set(adminDb.collection("fee-transfers").doc(orderId), {
            orderId,
            customerUid: decodedToken.uid,
            customerEmail: email.trim(),
            amountTotalCents: amountUsdCents,
            commissionBaseCents: pricingBreakdown.baseProductCents,
            currency: "usd",
            commissionPercent,
            platformFeeCents: agentPayoutCents + lootmasterFeeCents,
            agentUid: partnerUid,
            agentFeeSharePercent: partnerFeeSharePercent,
            agentPayoutCents,
            lootmasterFeeCents,
            partnerDiscountCents: Math.round(partnerDiscount * 100),
            partnerDiscountPartnerCents,
            partnerDiscountLootMasterCents,
            agentPayoutLootCoins: Math.round((agentPayoutCents / 100) * 100) / 100,
            agentPayoutCredited: false,
            status: "pending_completion",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
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

      return Response.json({
        url: `/checkout/success?session_id=${encodeURIComponent(orderId)}&delivery_method=${encodeURIComponent(deliveryMethod)}`,
      });
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

  const configuredAppUrl = process.env.APP_URL?.trim();
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const resolvedAppUrl = configuredAppUrl || (vercelUrl ? `https://${vercelUrl.replace(/^https?:\/\//, "")}` : "");
  if (!resolvedAppUrl && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Application URL is not configured." }, { status: 503 });
  }

  let appUrl = resolvedAppUrl || "http://localhost:3000";
  try {
    const parsedAppUrl = new URL(appUrl);
    if (process.env.NODE_ENV === "production" && parsedAppUrl.protocol !== "https:") {
      return Response.json({ error: "Application URL must use HTTPS." }, { status: 503 });
    }
    appUrl = parsedAppUrl.origin;
  } catch {
    return Response.json({ error: "Application URL is invalid." }, { status: 503 });
  }

  const configuredOrigins = new Set(
    [appUrl, process.env.NODE_ENV === "development" ? "http://localhost:3000" : null]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const requestOrigin = request.headers.get("origin")?.trim();
  const origin = requestOrigin && configuredOrigins.has(requestOrigin)
    ? requestOrigin
    : appUrl;

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
    paymentGateway: paymentMethod === "paypal" ? "paypal" : "stripe",
    paymentProvider: paymentMethod === "pix" ? "Pix" : paymentMethod === "paypal" ? "PayPal" : "Stripe",
    country: country ?? "",
    countryCode: countryCode ?? "",
    locale: locale ?? "",
    currency: selectedCurrency.toUpperCase(),
    email,
    clientIp,
    hasServerOptions: String(hasServerOptions),
    customerUid,
    partnerUid,
    agentReferralCode: normalizeAgentCode(agentReferralCode),
    partnerDiscountCents: String(Math.round(partnerDiscount * 100)),
    partnerDiscountPartnerCents: String(Math.round((basePrice * 0.05) * 100)),
    partnerDiscountLootMasterCents: String(Math.round((basePrice * 0.05) * 100)),
    supplierPercentage: String(supplierDefaultPercent),
    // Keep legacy field for compatibility with historical flows.
    commissionPercent: String(100 - supplierDefaultPercent),
    cardGatewayFeePercent: String(cardGatewayFeePercent),
    cashbackPercent: String(cashbackPercent),
    operationalReservePercent: String(operationalReservePercent),
    termsAccepted: "true",
    termsAcceptedAt: new Date().toISOString(),
  };

  if (paymentMethod === "pix") {
    const paymentId = `pix_${crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const notificationUrl = `${appUrl}/api/webhook/mercadopago`;

    try {
      const pixPayment = await createMercadoPagoPixPayment({
        amountCents: unitAmount,
        email,
        externalReference: paymentId,
        metadata,
        notificationUrl,
      });

      await getAdminDb().collection("order-checkouts").doc(paymentId).set({
        orderId: paymentId,
        paymentStatus: pixPayment.status,
        orderStatus: "pending_payment",
        amountTotalCents: unitAmount,
        customerEmail: email,
        ...metadata,
        currency: "brl",
        mercadoPagoPaymentId: pixPayment.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return Response.json({
        pix: {
          paymentId: pixPayment.id,
          orderId: paymentId,
          qrCode: pixPayment.qrCode,
          qrCodeBase64: pixPayment.qrCodeBase64,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mercado Pago PIX creation failed.";
      return Response.json({ error: message }, { status: 503 });
    }
  }

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
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&delivery_method=${encodeURIComponent(deliveryMethod)}`,
      cancel_url: `${origin}/checkout/cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe session creation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
