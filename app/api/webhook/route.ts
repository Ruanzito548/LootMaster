import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import {
  computeFeeBreakdown,
  DEFAULT_AGENT_FEE_SHARE_PERCENT,
  normalizeAgentCode,
} from "@/lib/agency";
import { writeActivityLog } from "@/lib/activity-history.server";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { resolveDiscordChannelId } from "@/lib/discord-channel-resolver";
import { isDiscordAutoSendEnabled } from "@/lib/discord-settings";
import { getAdminDb } from "@/lib/firebase-admin";
import { fundChestWalletEconomyFromCashback, sanitizeChestWalletEconomyConfig } from "@/lib/chest-wallet-economy";
import { computeOrderFinancials } from "@/lib/order-financials";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";
import { syncPaidOrderToWalletBackend } from "@/lib/wallet-backend";
import { calculateLevelProgress, calculateTotalXp } from "../../../lib/level-rewards";

/**
 * Stripe webhook endpoint.
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY              — Stripe secret API key
 *   STRIPE_WEBHOOK_SECRET          — Signing secret from the webhook endpoint in the Stripe dashboard
 *
 * Discord bot channel IDs (one per game+category combination):
 *   DISCORD_CHANNEL_WOW_TBC_GOLD        — WoW TBC Anniversary gold sales
 *   DISCORD_CHANNEL_WOW_RETAIL_GOLD     — WoW Retail (Midnight) gold sales
 *   DISCORD_CHANNEL_WOW_CLASSIC_GOLD    — WoW Classic Era gold sales
 *   DISCORD_CHANNEL_WOW_PANDARIA_GOLD   — WoW Mist of Pandaria gold sales
 *   DISCORD_CHANNEL_DEFAULT             — (optional) catch-all for unmatched orders
 *
 * Also required for bot API calls:
 *   DISCORD_BOT_TOKEN
 *
 * Register this endpoint in the Stripe dashboard:
 *   https://lootmaster.vercel.app/api/webhook
 *
 * Events handled:
 *   checkout.session.completed  (payment_status === "paid")
 *   checkout.session.async_payment_succeeded (payment_status === "paid")
 */

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

async function resolveCurrentFinancialSettings() {
  const adminDb = getAdminDb();

  try {
    const snapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    if (!snapshot.exists) {
      return buildDefaultSiteFeeSettings();
    }

    return sanitizeSiteFeeSettings(snapshot.data());
  } catch {
    return buildDefaultSiteFeeSettings();
  }
}

export async function resolveSessionSupplierPercent(session: Stripe.Checkout.Session): Promise<number> {
  const meta = session.metadata ?? {};
  const parsedSupplier = Number(meta.supplierPercentage);

  if (Number.isFinite(parsedSupplier)) {
    return clampPercent(parsedSupplier);
  }

  const legacyCommission = Number(meta.commissionPercent);
  if (Number.isFinite(legacyCommission)) {
    return clampPercent(legacyCommission);
  }

  const settings = await resolveCurrentFinancialSettings();
  return settings.supplierDefaultPercent;
}

async function resolveSessionCostPercents(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const settings = await resolveCurrentFinancialSettings();

  const cardGatewayFeePercent = Number.isFinite(Number(meta.cardGatewayFeePercent))
    ? clampPercent(Number(meta.cardGatewayFeePercent))
    : settings.cardGatewayFeePercent;
  const cashbackPercent = Number.isFinite(Number(meta.cashbackPercent))
    ? clampPercent(Number(meta.cashbackPercent))
    : settings.cashbackPercent;
  const operationalReservePercent = Number.isFinite(Number(meta.operationalReservePercent))
    ? clampPercent(Number(meta.operationalReservePercent))
    : settings.operationalReservePercent;

  return {
    cardGatewayFeePercent,
    cashbackPercent,
    operationalReservePercent,
  };
}

async function fundChestEconomyFromCashback(orderId: string, cashbackCents: number): Promise<void> {
  if (cashbackCents <= 0) {
    return;
  }

  const adminDb = getAdminDb();
  const configDocRef = adminDb.collection("app-config").doc("chest-system");

  await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(configDocRef);
    const currentData = snapshot.exists ? (snapshot.data() as Record<string, unknown> | undefined) : undefined;
    const walletConfig = sanitizeChestWalletEconomyConfig(currentData?.walletEconomy);
    const walletEconomyState = currentData?.walletEconomyState as Record<string, unknown> | undefined;
    const walletStateMap = (walletEconomyState?.wallets as Record<string, unknown> | undefined) ?? {};
    const normalWallet = (walletStateMap["normal"] as Record<string, unknown> | undefined) ?? {};
    const jackpotCommonWallet = (walletStateMap["jackpotCommon"] as Record<string, unknown> | undefined) ?? {};
    const jackpotRareWallet = (walletStateMap["jackpotRare"] as Record<string, unknown> | undefined) ?? {};
    const walletState = walletEconomyState
      ? {
          wallets: {
            normal: {
              balanceUsd: Number(normalWallet.balanceUsd ?? 0),
              totalReceivedUsd: Number(normalWallet.totalReceivedUsd ?? 0),
              totalDistributedUsd: Number(normalWallet.totalDistributedUsd ?? 0),
              rewardCount: Number(normalWallet.rewardCount ?? 0),
              lastMovementAtMs: Number(normalWallet.lastMovementAtMs ?? Date.now()),
            },
            jackpotCommon: {
              balanceUsd: Number(jackpotCommonWallet.balanceUsd ?? 0),
              totalReceivedUsd: Number(jackpotCommonWallet.totalReceivedUsd ?? 0),
              totalDistributedUsd: Number(jackpotCommonWallet.totalDistributedUsd ?? 0),
              rewardCount: Number(jackpotCommonWallet.rewardCount ?? 0),
              lastMovementAtMs: Number(jackpotCommonWallet.lastMovementAtMs ?? Date.now()),
            },
            jackpotRare: {
              balanceUsd: Number(jackpotRareWallet.balanceUsd ?? 0),
              totalReceivedUsd: Number(jackpotRareWallet.totalReceivedUsd ?? 0),
              totalDistributedUsd: Number(jackpotRareWallet.totalDistributedUsd ?? 0),
              rewardCount: Number(jackpotRareWallet.rewardCount ?? 0),
              lastMovementAtMs: Number(jackpotRareWallet.lastMovementAtMs ?? Date.now()),
            },
          },
          ledger: Array.isArray(walletEconomyState.ledger)
            ? ((walletEconomyState.ledger as Array<Record<string, unknown>>).map((entry) => ({
                id: String(entry.id ?? `legacy-${Date.now()}-${Math.random()}`),
                walletId: (entry.walletId as "normal" | "jackpotCommon" | "jackpotRare") ?? (entry.walletKey as "normal" | "jackpotCommon" | "jackpotRare") ?? "normal",
                type: (entry.type as "funding" | "reward" | "jackpot" | "adjustment" | "refund") ?? (entry.movementType as "funding" | "reward" | "jackpot" | "adjustment" | "refund") ?? "adjustment",
                amountUsd: Number(entry.amountUsd ?? 0),
                balanceBeforeUsd: Number(entry.balanceBeforeUsd ?? 0),
                balanceAfterUsd: Number(entry.balanceAfterUsd ?? 0),
                description: String(entry.description ?? entry.source ?? "Wallet movement"),
                createdAt: String(entry.createdAt ?? new Date().toISOString()),
                source: entry.source ? String(entry.source) : undefined,
                referenceId: entry.referenceId ? String(entry.referenceId) : undefined,
                createdAtMs: Number(entry.createdAtMs ?? Date.now()),
                metadata: entry.metadata && typeof entry.metadata === "object" ? (entry.metadata as Record<string, unknown>) : undefined,
              })))
            : [],
          updatedAtMs: Number(walletEconomyState.updatedAtMs ?? Date.now()),
        }
      : {
          wallets: {
            normal: { balanceUsd: 0, totalReceivedUsd: 0, totalDistributedUsd: 0, rewardCount: 0, lastMovementAtMs: Date.now() },
            jackpotCommon: { balanceUsd: 0, totalReceivedUsd: 0, totalDistributedUsd: 0, rewardCount: 0, lastMovementAtMs: Date.now() },
            jackpotRare: { balanceUsd: 0, totalReceivedUsd: 0, totalDistributedUsd: 0, rewardCount: 0, lastMovementAtMs: Date.now() },
          },
          ledger: [],
          updatedAtMs: Date.now(),
        };
    const nextState = fundChestWalletEconomyFromCashback(walletState, cashbackCents / 100, walletConfig);

    tx.set(
      configDocRef,
      {
        walletEconomy: walletConfig,
        walletEconomyState: nextState,
        updatedAt: FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
        economyUpdatedBy: orderId,
      },
      { merge: true },
    );
  });
}

export async function persistPaidOrder(session: Stripe.Checkout.Session, supplierPercentage: number): Promise<void> {
  const meta = session.metadata ?? {};
  const adminDb = getAdminDb();
  const amountTotalCents = session.amount_total ?? 0;
  const baseProductCents = Number(meta.baseProductCents ?? meta.baseAmountCents ?? amountTotalCents) || amountTotalCents;
  const deliverySurchargeCents = Number(meta.deliverySurchargeCents ?? 0) || 0;
  const paymentSurchargeCents = Number(meta.paymentSurchargeCents ?? 0) || 0;
  const costs = await resolveSessionCostPercents(session);
  const financialBase = computeOrderFinancials(
    amountTotalCents,
    supplierPercentage,
    costs.cardGatewayFeePercent,
    costs.cashbackPercent,
    costs.operationalReservePercent,
  );
  const supplierPayout = Math.max(0, Math.round(baseProductCents * (financialBase.supplierPercentage / 100)));
  const grossProfit = Math.max(0, amountTotalCents - supplierPayout);
  const netProfit = grossProfit - financialBase.cardFee - financialBase.cashback - financialBase.operationalReserve;

  await adminDb.collection("order-checkouts").doc(session.id).set(
    {
      orderId: session.id,
      paymentStatus: session.payment_status ?? "unknown",
      amountTotalCents,
      currency: (session.currency ?? "brl").toLowerCase(),
      customerEmail: session.customer_email ?? "",
      customerUid: meta.customerUid ?? "",
      agentReferralCode: meta.agentReferralCode ?? "",
      baseProductCents,
      deliverySurchargeCents,
      paymentSurchargeCents,
      // Legacy compatibility field
      baseAmountCents: baseProductCents,
      gameId: meta.gameId ?? "",
      gameTitle: meta.gameTitle ?? "",
      categoryId: meta.categoryId ?? "",
      categoryTitle: meta.categoryTitle ?? "",
      goldAmount: Number(meta.goldAmount ?? 0) || 0,
      pricePerThousand: Number(meta.pricePerThousand ?? 0) || 0,
      finalAmountCents: Number(meta.finalAmountCents ?? session.amount_total ?? 0) || 0,
      serverId: meta.serverId ?? "",
      server: meta.server ?? "",
      faction: meta.faction ?? "",
      deliveryMethod: meta.deliveryMethod ?? "",
      nickname: meta.nickname ?? "",
      paymentMethod: meta.paymentMethod ?? "",
      paymentGateway: meta.paymentGateway ?? "",
      paymentProvider: meta.paymentProvider ?? "",
      country: meta.country ?? "",
      countryCode: meta.countryCode ?? "",
      locale: meta.locale ?? "",
      clientIp: meta.clientIp ?? "",
      hasServerOptions: meta.hasServerOptions === "true",
      supplierId: meta.supplierId ?? "",
      supplierName: meta.supplierName ?? "",
      supplierPercentage: financialBase.supplierPercentage,
      grossRevenue: amountTotalCents,
      supplierPayout,
      grossProfit,
      cardFee: financialBase.cardFee,
      cashback: financialBase.cashback,
      operationalReserve: financialBase.operationalReserve,
      netProfit,
      cardFeePercent: costs.cardGatewayFeePercent,
      cashbackPercent: costs.cashbackPercent,
      operationalReservePercent: costs.operationalReservePercent,
      // Legacy fields kept for compatibility with old consumers.
      commissionPercent: Math.max(0, 100 - financialBase.supplierPercentage),
      sellerAmountCents: supplierPayout,
      platformProfitCents: netProfit,
      stripeCreatedAt: typeof session.created === "number" ? new Date(session.created * 1000).toISOString() : null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  await fundChestEconomyFromCashback(session.id, financialBase.cashback);
}

type ResolvedCustomerAgent = {
  customerUid: string | null;
  agentUid: string | null;
  agentFeeSharePercent: number;
};

type CustomerProfile = {
  customerUid: string | null;
  customerData: Record<string, unknown> | null;
};

async function resolveCustomerProfile(session: Stripe.Checkout.Session): Promise<CustomerProfile> {
  const adminDb = getAdminDb();
  const meta = session.metadata ?? {};
  const customerUidFromMeta = typeof meta.customerUid === "string" ? meta.customerUid.trim() : "";
  const customerEmail = (session.customer_email ?? "").trim().toLowerCase();

  let customerUid: string | null = customerUidFromMeta || null;
  let customerData: Record<string, unknown> | null = null;

  if (customerUid) {
    const customerDoc = await adminDb.collection("users").doc(customerUid).get();
    if (customerDoc.exists) {
      customerData = customerDoc.data() as Record<string, unknown>;
    } else {
      customerUid = null;
    }
  }

  if (!customerUid && customerEmail) {
    const customerSnapshot = await adminDb
      .collection("users")
      .where("email", "==", customerEmail)
      .limit(1)
      .get();

    if (!customerSnapshot.empty) {
      customerUid = customerSnapshot.docs[0].id;
      customerData = customerSnapshot.docs[0].data() as Record<string, unknown>;
    }
  }

  return { customerUid, customerData };
}

async function resolveAgentUidByReferralCode(referralCodeRaw: string, customerUid: string): Promise<string | null> {
  const referralCode = normalizeAgentCode(referralCodeRaw);
  if (!referralCode || referralCode === normalizeAgentCode(customerUid)) {
    return null;
  }

  const adminDb = getAdminDb();

  const directAgentDoc = await adminDb.collection("users").doc(referralCode).get();
  if (directAgentDoc.exists) {
    const directData = directAgentDoc.data() as Record<string, unknown>;
    if (directData.isAgent === true) {
      return directAgentDoc.id;
    }
  }

  const agentSnapshot = await adminDb
    .collection("users")
    .where("agentReferralCode", "==", referralCode)
    .where("isAgent", "==", true)
    .limit(1)
    .get();

  if (!agentSnapshot.empty) {
    return agentSnapshot.docs[0].id;
  }

  return null;
}

export async function maybeBindFirstPurchaseAgent(session: Stripe.Checkout.Session): Promise<void> {
  const adminDb = getAdminDb();
  const meta = session.metadata ?? {};
  const referralCode = normalizeAgentCode(meta.agentReferralCode);

  if (!referralCode) {
    return;
  }

  const { customerUid, customerData } = await resolveCustomerProfile(session);
  if (!customerUid || !customerData) {
    return;
  }

  const assignedAgentId = typeof customerData.assignedAgentId === "string" ? customerData.assignedAgentId.trim() : "";
  const currentSpentCents = typeof customerData.totalSpentCents === "number" && Number.isFinite(customerData.totalSpentCents)
    ? customerData.totalSpentCents
    : 0;

  if (assignedAgentId || currentSpentCents > 0) {
    return;
  }

  const agentUid = await resolveAgentUidByReferralCode(referralCode, customerUid);
  if (!agentUid) {
    return;
  }

  await adminDb.collection("users").doc(customerUid).set(
    {
      assignedAgentId: agentUid,
      assignedAgentAt: FieldValue.serverTimestamp(),
      assignedByReferralCode: referralCode,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function resolveCustomerAgent(session: Stripe.Checkout.Session): Promise<ResolvedCustomerAgent> {
  const adminDb = getAdminDb();
  const { customerUid, customerData } = await resolveCustomerProfile(session);

  if (!customerUid || !customerData) {
    return {
      customerUid: null,
      agentUid: null,
      agentFeeSharePercent: DEFAULT_AGENT_FEE_SHARE_PERCENT,
    };
  }

  const assignedAgentId =
    typeof customerData.assignedAgentId === "string"
      ? customerData.assignedAgentId.trim()
      : "";

  if (!assignedAgentId || assignedAgentId === customerUid) {
    return {
      customerUid,
      agentUid: null,
      agentFeeSharePercent: DEFAULT_AGENT_FEE_SHARE_PERCENT,
    };
  }

  const agentDoc = await adminDb.collection("users").doc(assignedAgentId).get();

  if (!agentDoc.exists) {
    return {
      customerUid,
      agentUid: null,
      agentFeeSharePercent: DEFAULT_AGENT_FEE_SHARE_PERCENT,
    };
  }

  const agentData = agentDoc.data() as Record<string, unknown>;
  const isAgent = agentData.isAgent === true;
  if (!isAgent) {
    return {
      customerUid,
      agentUid: null,
      agentFeeSharePercent: DEFAULT_AGENT_FEE_SHARE_PERCENT,
    };
  }

  const rawShare =
    typeof agentData.agentFeeSharePercent === "number" && Number.isFinite(agentData.agentFeeSharePercent)
      ? agentData.agentFeeSharePercent
      : DEFAULT_AGENT_FEE_SHARE_PERCENT;

  return {
    customerUid,
    agentUid: assignedAgentId,
    agentFeeSharePercent: rawShare,
  };
}

export async function processFeeTransfer(session: Stripe.Checkout.Session): Promise<void> {
  const adminDb = getAdminDb();
  const meta = session.metadata ?? {};
  const totalCents = session.amount_total ?? 0;
  const baseProductCents = Number(meta.baseProductCents ?? meta.baseAmountCents ?? 0) || 0;
  const supplierPercentage = await resolveSessionSupplierPercent(session);
  const commissionPercent = Math.max(0, 100 - supplierPercentage);
  const commissionBaseCents = baseProductCents > 0 ? baseProductCents : totalCents;
  const customerAgent = await resolveCustomerAgent(session);
  const feeBreakdown = computeFeeBreakdown(
    commissionBaseCents,
    commissionPercent,
    customerAgent.agentUid ? customerAgent.agentFeeSharePercent : 0,
  );
  const agentPayoutLootCoins = Math.round((feeBreakdown.agentPayoutCents / 100) * 100) / 100;

  const feeRef = adminDb.collection("fee-transfers").doc(session.id);
  const checkoutRef = adminDb.collection("order-checkouts").doc(session.id);

  await adminDb.runTransaction(async (tx) => {
    const feeSnapshot = await tx.get(feeRef);

    if (feeSnapshot.exists) {
      return;
    }

    tx.set(
      feeRef,
      {
        orderId: session.id,
        customerUid: customerAgent.customerUid,
        customerEmail: session.customer_email ?? "",
        amountTotalCents: totalCents,
        commissionBaseCents,
        currency: (session.currency ?? "brl").toLowerCase(),
        commissionPercent,
        platformFeeCents: feeBreakdown.platformFeeCents,
        agentUid: customerAgent.agentUid,
        agentFeeSharePercent: customerAgent.agentUid ? customerAgent.agentFeeSharePercent : 0,
        agentPayoutCents: feeBreakdown.agentPayoutCents,
        lootmasterFeeCents: feeBreakdown.lootmasterFeeCents,
        agentPayoutLootCoins,
        agentPayoutCredited: false,
        status: "pending_completion",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(
      checkoutRef,
      {
        customerUid: customerAgent.customerUid,
        assignedAgentId: customerAgent.agentUid,
        commissionPercent,
        supplierPercentage,
        platformFeeCents: feeBreakdown.platformFeeCents,
        agentPayoutCents: feeBreakdown.agentPayoutCents,
        lootmasterFeeCents: feeBreakdown.lootmasterFeeCents,
        platformProfitCents: feeBreakdown.lootmasterFeeCents,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    if (customerAgent.customerUid && feeBreakdown.platformFeeCents > 0) {
      writeActivityLog(tx, adminDb, {
        userUid: customerAgent.customerUid,
        actorRole: "system",
        actionType: "platform_fee_charged",
        category: "marketplace",
        description: `Platform fee charged for order ${session.id}.`,
        value: feeBreakdown.platformFeeCents / 100,
        valueUnit: "usd",
        origin: "stripe:webhook:fee-transfer",
        status: "completed",
        tags: ["economy", "fee", "order"],
        metadata: {
          orderId: session.id,
          commissionPercent,
        },
        mirrorToAdminAudit: true,
      });
    }
  });
}

export async function applyPurchaseLevelRewards(session: Stripe.Checkout.Session): Promise<void> {
  const adminDb = getAdminDb();
  const meta = session.metadata ?? {};
  const customerEmail = (session.customer_email ?? "").trim().toLowerCase();
  let customerUid = typeof meta.customerUid === "string" ? meta.customerUid.trim() : "";
  let customerData: Record<string, unknown> | null = null;

  if (customerUid) {
    const customerDoc = await adminDb.collection("users").doc(customerUid).get();

    if (customerDoc.exists) {
      customerData = customerDoc.data() as Record<string, unknown>;
    } else {
      customerUid = "";
    }
  }

  if (!customerUid && customerEmail) {
    const customerSnapshot = await adminDb
      .collection("users")
      .where("email", "==", customerEmail)
      .limit(1)
      .get();

    if (!customerSnapshot.empty) {
      customerUid = customerSnapshot.docs[0].id;
      customerData = customerSnapshot.docs[0].data() as Record<string, unknown>;
    }
  }

  if (!customerUid || !customerData) {
    return;
  }

  const spendCents = Math.max(0, Math.round((session.amount_total ?? 0)));
  const spendUsd = Math.round((spendCents / 100) * 100) / 100;
  const gainedXp = calculateTotalXp(spendCents);

  if (spendCents <= 0) {
    return;
  }

  const userRef = adminDb.collection("users").doc(customerUid);
  const rewardCreditRef = adminDb.collection("level-reward-credits").doc(session.id);

  await adminDb.runTransaction(async (tx) => {
    const rewardCreditSnapshot = await tx.get(rewardCreditRef);

    if (rewardCreditSnapshot.exists) {
      return;
    }

    const snapshot = await tx.get(userRef);

    if (!snapshot.exists) {
      return;
    }

    const userData = snapshot.data() as Record<string, unknown>;
    const currentSpentCents =
      typeof userData.totalSpentCents === "number" && Number.isFinite(userData.totalSpentCents)
        ? userData.totalSpentCents
        : 0;
    const nextSpentCents = currentSpentCents + spendCents;
    const currentProgress = calculateLevelProgress(currentSpentCents);
    const nextProgress = calculateLevelProgress(nextSpentCents);
    const currentRewardLevel =
      typeof userData.highestRewardedLevel === "number" && Number.isFinite(userData.highestRewardedLevel)
        ? userData.highestRewardedLevel
        : currentProgress.level;
    const currentRewardsClaimed =
      typeof userData.totalRewardsClaimed === "number" && Number.isFinite(userData.totalRewardsClaimed)
        ? userData.totalRewardsClaimed
        : 0;

    const unlockedLevels = nextProgress.level > currentRewardLevel
      ? Array.from({ length: nextProgress.level - currentRewardLevel }, (_, index) => currentRewardLevel + index + 1)
      : [];
    const nowIso = new Date().toISOString();

    tx.set(
      userRef,
      {
        totalSpentCents: nextSpentCents,
        level: nextProgress.level,
        levelXpCents: nextProgress.xpCents,
        nextLevelXpCents: nextProgress.nextLevelXpCents,
        highestRewardedLevel: currentRewardLevel,
        lifetimeXp: nextProgress.totalXp,
        totalRewardsClaimed: currentRewardsClaimed,
        lastXpGain: gainedXp,
        lastSpendUsd: spendUsd,
        lastLevelUpLevel: nextProgress.level > currentProgress.level ? nextProgress.level : 0,
        lastLevelUpAt: nextProgress.level > currentProgress.level ? nowIso : "",
        lastProgressAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true },
    );

    tx.set(
      rewardCreditRef,
      {
        orderId: session.id,
        customerUid,
        spendCents,
        levelsUnlocked: unlockedLevels,
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );

    writeActivityLog(tx, adminDb, {
      userUid: customerUid,
      actorRole: "system",
      actionType: "purchase_completed",
      category: "economy",
      description: `Purchased ${meta.categoryTitle ?? "service"} for ${spendUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}.`,
      value: spendUsd,
      valueUnit: "usd",
      origin: "stripe:webhook:checkout-session-completed",
      status: "completed",
      tags: ["economy", "purchase", "stripe"],
      metadata: {
        orderId: session.id,
        gameTitle: meta.gameTitle ?? "",
        categoryTitle: meta.categoryTitle ?? "",
      },
    });

    writeActivityLog(tx, adminDb, {
      userUid: customerUid,
      actorRole: "system",
      actionType: "xp_received",
      category: "progression",
      description: `Received ${gainedXp.toFixed(2)} XP from completed purchase.`,
      value: gainedXp,
      valueUnit: "xp",
      origin: "stripe:webhook:level-rewards",
      status: "completed",
      tags: ["progression", "xp"],
      metadata: {
        orderId: session.id,
      },
    });

    if (nextProgress.level > currentProgress.level) {
      writeActivityLog(tx, adminDb, {
        userUid: customerUid,
        actorRole: "system",
        actionType: "level_up",
        category: "progression",
        description: `Reached level ${nextProgress.level}.`,
        value: nextProgress.level,
        valueUnit: "item",
        origin: "stripe:webhook:level-rewards",
        status: "completed",
        tags: ["progression", "level-up"],
        metadata: {
          previousLevel: currentProgress.level,
          nextLevel: nextProgress.level,
          orderId: session.id,
        },
      });
    }

    if (unlockedLevels.length > 0) {
      writeActivityLog(tx, adminDb, {
        userUid: customerUid,
        actorRole: "system",
        actionType: "progression_updated",
        category: "progression",
        description: `Rewards became available for levels ${unlockedLevels.join(", ")}. Claim them in Battle Pass.`,
        origin: "stripe:webhook:level-rewards",
        status: "completed",
        tags: ["progression", "reward", "claim-available"],
        metadata: {
          orderId: session.id,
          unlockedLevels: unlockedLevels.join(","),
          unlockedLevelCount: unlockedLevels.length,
        },
      });
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return Response.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed.";
    console.error("[Stripe Webhook] Signature error:", message);
    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    // Only notify for fully paid sessions
    if (session.payment_status === "paid") {
      const supplierPercentage = await resolveSessionSupplierPercent(session);
      const amountTotalCents = session.amount_total ?? 0;
      // Supplier share is calculated over the product value only, excluding payment gateway surcharge.
      const supplierBaseCents =
        Number(meta.baseProductCents ?? meta.baseAmountCents ?? amountTotalCents) || amountTotalCents;
      const supplierPayoutCents = Math.max(0, Math.round(supplierBaseCents * (supplierPercentage / 100)));

      try {
        await persistPaidOrder(session, supplierPercentage);
      } catch (err) {
        console.error("[Stripe Webhook] Could not persist paid order to Firestore:", err);
      }

      try {
        await maybeBindFirstPurchaseAgent(session);
      } catch (err) {
        console.error("[Stripe Webhook] Could not bind first-purchase agent referral:", err);
      }

      try {
        await processFeeTransfer(session);
      } catch (err) {
        console.error("[Stripe Webhook] Could not process fee transfer:", err);
      }

      try {
        await applyPurchaseLevelRewards(session);
      } catch (err) {
        console.error("[Stripe Webhook] Could not apply level rewards:", err);
      }

      try {
        await syncPaidOrderToWalletBackend({
          orderId: session.id,
          customerId: session.customer_email ?? null,
          totalAmount: amountTotalCents / 100,
          supplierPayout: supplierPayoutCents / 100,
          currency: (session.currency ?? "usd").toUpperCase(),
          metadata: {
            gameId: meta.gameId ?? "",
            gameTitle: meta.gameTitle ?? "",
            categoryId: meta.categoryId ?? "",
            categoryTitle: meta.categoryTitle ?? "",
            server: meta.server ?? "",
            faction: meta.faction ?? "",
            nickname: meta.nickname ?? "",
            goldAmount: Number(meta.goldAmount ?? 0) || 0,
          },
        });
      } catch (err) {
        console.error("[Stripe Webhook] Wallet backend order sync failed:", err);
      }

      const discordChannelId = await resolveDiscordChannelId(
        meta.gameId ?? "",
        meta.categoryId ?? meta.categoryTitle?.toLowerCase() ?? "",
      );
      try {
        const autoSendEnabled = await isDiscordAutoSendEnabled();

        if (!autoSendEnabled) {
          console.info("[Stripe Webhook] Discord auto-send disabled — skipping automatic notification.");
        } else {
        const notification = await sendOrderNotificationViaBot({
          gameId: meta.gameId ?? "",
          channelId: discordChannelId,
          sessionId: session.id,
          gameTitle: meta.gameTitle ?? "—",
          categoryTitle: meta.categoryTitle ?? "—",
          goldAmount: meta.goldAmount ?? "0",
          serverId: meta.serverId ?? "",
          server: meta.server ?? "—",
          faction: meta.faction ?? "—",
          nickname: meta.nickname ?? "—",
          paymentMethod: meta.paymentMethod ?? "—",
          finalAmountCents: meta.finalAmountCents ?? String(session.amount_total ?? 0),
          supplierPayoutCents: String(supplierPayoutCents),
          currency: session.currency ?? "brl",
          email: session.customer_email ?? "—",
        });

        if (notification) {
          await getAdminDb()
            .collection("order-checkouts")
            .doc(session.id)
            .set(
              {
                discordNotificationChannelId: notification.channelId,
                discordNotificationMessageId: notification.messageId,
              },
              { merge: true },
            );
        }
        }
      } catch (err) {
        // Log the error but don't return a 500 - Stripe would retry endlessly
        console.error("[Stripe Webhook] Discord bot notification failed:", err);
      }
    }
  }

  return Response.json({ received: true });
}
