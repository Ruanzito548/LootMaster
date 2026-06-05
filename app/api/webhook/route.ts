import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import {
  computeFeeBreakdown,
  DEFAULT_AGENT_FEE_SHARE_PERCENT,
  DEFAULT_PLATFORM_FEE_PERCENT,
} from "@/lib/agency";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncPaidOrderToWalletBackend } from "@/lib/wallet-backend";
import { buildLevelRewards, buildUnlockHistoryItem, calculateLevelProgress, calculateTotalXp } from "../../../lib/level-rewards";

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
 */

/**
 * Returns the correct Discord channel ID for a given gameId + categoryId pair.
 *
 * Priority:
 *   1) DISCORD_CHANNEL_* variables
 *   2) Legacy DISCORD_WEBHOOK_* variables (resolved to channel_id at runtime)
 */
function parseDiscordWebhookUrl(webhookUrl: string): { webhookId: string; webhookToken: string } | null {
  try {
    const parsed = new URL(webhookUrl);
    const [, , resource, webhookId, webhookToken] = parsed.pathname.split("/");
    if (resource !== "webhooks" || !webhookId || !webhookToken) return null;
    return { webhookId, webhookToken };
  } catch {
    return null;
  }
}

const channelIdCache = new Map<string, string>();

async function resolveDiscordChannelId(gameId: string, categoryId: string): Promise<string | null> {
  const key = `${gameId}::${categoryId}`;
  const channelMap: Record<string, string | undefined> = {
    "tbc-anniversary::gold":  process.env.DISCORD_CHANNEL_WOW_TBC_GOLD,
    "retail::gold":           process.env.DISCORD_CHANNEL_WOW_RETAIL_GOLD,
    "classic-era::gold":      process.env.DISCORD_CHANNEL_WOW_CLASSIC_GOLD,
    "mist-of-pandaria::gold": process.env.DISCORD_CHANNEL_WOW_PANDARIA_GOLD,
  };
  const explicitChannelId = channelMap[key] ?? process.env.DISCORD_CHANNEL_DEFAULT ?? null;
  if (explicitChannelId) {
    return explicitChannelId;
  }

  const webhookMap: Record<string, string | undefined> = {
    "tbc-anniversary::gold":  process.env.DISCORD_WEBHOOK_WOW_TBC_GOLD,
    "retail::gold":           process.env.DISCORD_WEBHOOK_WOW_RETAIL_GOLD,
    "classic-era::gold":      process.env.DISCORD_WEBHOOK_WOW_CLASSIC_GOLD,
    "mist-of-pandaria::gold": process.env.DISCORD_WEBHOOK_WOW_PANDARIA_GOLD,
  };

  const webhookUrl = webhookMap[key] ?? process.env.DISCORD_WEBHOOK_DEFAULT ?? null;
  if (!webhookUrl) {
    return null;
  }

  const cachedChannelId = channelIdCache.get(webhookUrl);
  if (cachedChannelId) {
    return cachedChannelId;
  }

  const webhookIdentity = parseDiscordWebhookUrl(webhookUrl);
  if (!webhookIdentity) {
    console.warn("[Stripe Webhook] Invalid Discord webhook URL format. Could not resolve channel ID.");
    return null;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${webhookIdentity.webhookId}/${webhookIdentity.webhookToken}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[Stripe Webhook] Failed to resolve channel from webhook: ${response.status} - ${text}`);
      return null;
    }

    const payload = (await response.json()) as { channel_id?: string };
    if (!payload.channel_id) {
      console.warn("[Stripe Webhook] Webhook payload does not contain channel_id.");
      return null;
    }

    channelIdCache.set(webhookUrl, payload.channel_id);
    return payload.channel_id;
  } catch (error) {
    console.warn("[Stripe Webhook] Error resolving channel from webhook.", error);
    return null;
  }
}

async function persistPaidOrder(session: Stripe.Checkout.Session): Promise<void> {
  const meta = session.metadata ?? {};
  const adminDb = getAdminDb();
  const amountTotalCents = session.amount_total ?? 0;
  const baseAmountCents = Number(meta.baseAmountCents ?? 0) || 0;
  const commissionPercent = Number(meta.commissionPercent ?? DEFAULT_PLATFORM_FEE_PERCENT) || DEFAULT_PLATFORM_FEE_PERCENT;
  const commissionBaseCents = baseAmountCents > 0 ? baseAmountCents : amountTotalCents;
  const sellerAmountCents = Math.round(commissionBaseCents * (1 - commissionPercent / 100));
  const platformProfitCents = commissionBaseCents - sellerAmountCents;

  await adminDb.collection("order-checkouts").doc(session.id).set(
    {
      orderId: session.id,
      paymentStatus: session.payment_status ?? "unknown",
      amountTotalCents,
      currency: (session.currency ?? "brl").toLowerCase(),
      customerEmail: session.customer_email ?? "",
      customerUid: meta.customerUid ?? "",
      baseAmountCents: commissionBaseCents,
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
      hasServerOptions: meta.hasServerOptions === "true",
      commissionPercent,
      sellerAmountCents,
      platformProfitCents,
      stripeCreatedAt: typeof session.created === "number" ? new Date(session.created * 1000).toISOString() : null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

type ResolvedCustomerAgent = {
  customerUid: string | null;
  agentUid: string | null;
  agentFeeSharePercent: number;
};

async function resolveCustomerAgent(session: Stripe.Checkout.Session): Promise<ResolvedCustomerAgent> {
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

async function processFeeTransfer(session: Stripe.Checkout.Session): Promise<void> {
  const adminDb = getAdminDb();
  const meta = session.metadata ?? {};
  const totalCents = session.amount_total ?? 0;
  const baseAmountCents = Number(meta.baseAmountCents ?? 0) || 0;
  const commissionPercent = Number(meta.commissionPercent ?? DEFAULT_PLATFORM_FEE_PERCENT) || DEFAULT_PLATFORM_FEE_PERCENT;
  const commissionBaseCents = baseAmountCents > 0 ? baseAmountCents : totalCents;
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
        amountTotalCents: commissionBaseCents,
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
        platformFeeCents: feeBreakdown.platformFeeCents,
        agentPayoutCents: feeBreakdown.agentPayoutCents,
        lootmasterFeeCents: feeBreakdown.lootmasterFeeCents,
        platformProfitCents: feeBreakdown.lootmasterFeeCents,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}

async function applyPurchaseLevelRewards(session: Stripe.Checkout.Session): Promise<void> {
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

    const nextInventory = Array.isArray(userData.inventory)
      ? [...(userData.inventory as unknown[])]
      : [];

    const rewardLevels = nextProgress.level > currentRewardLevel
      ? buildLevelRewards(currentRewardLevel + 1, nextProgress.level, session.id)
      : [];

    const nowIso = new Date().toISOString();
    const storedUnlocks = Array.isArray(userData.recentUnlocks)
      ? [...(userData.recentUnlocks as unknown[])]
      : [];
    const nextUnlockHistory = [
      ...rewardLevels.map((reward) => buildUnlockHistoryItem(reward, session.id, nowIso)),
      ...storedUnlocks,
    ].slice(0, 24);

    for (const reward of rewardLevels) {
      nextInventory.push(reward.inventoryItem);

      if (reward.bonusDrop) {
        nextInventory.push({
          id: `bonus-${session.id}-${reward.level}`,
          name: reward.bonusDrop.title,
          category: "Reward",
          description: `${reward.bonusDrop.rarity} bonus drop from milestone level ${reward.level}.`,
          quantity: 1,
          rarity:
            reward.bonusDrop.rarity === "mythic"
              ? "artifact"
              : reward.bonusDrop.rarity,
          iconPath: "/itens/general/ticket.png",
        });
      }
    }

    tx.set(
      userRef,
      {
        totalSpentCents: nextSpentCents,
        level: nextProgress.level,
        levelXpCents: nextProgress.xpCents,
        nextLevelXpCents: nextProgress.nextLevelXpCents,
        highestRewardedLevel: Math.max(currentRewardLevel, nextProgress.level),
        inventory: nextInventory,
        recentUnlocks: nextUnlockHistory,
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
        levelsGranted: rewardLevels.map((reward) => reward.level),
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    // Only notify for fully paid sessions
    if (session.payment_status === "paid") {
      try {
        await persistPaidOrder(session);
      } catch (err) {
        console.error("[Stripe Webhook] Could not persist paid order to Firestore:", err);
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
        const amountTotalCents = session.amount_total ?? 0;
        const baseAmountCents = Number(meta.baseAmountCents ?? 0) || 0;
        const commissionBaseCents = baseAmountCents > 0 ? baseAmountCents : amountTotalCents;
        const commissionPercent = Number(meta.commissionPercent ?? 15) || 15;
        const supplierPayoutCents = Math.round(commissionBaseCents * (1 - commissionPercent / 100));

        await syncPaidOrderToWalletBackend({
          orderId: session.id,
          customerId: session.customer_email ?? null,
          totalAmount: commissionBaseCents / 100,
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
        await sendOrderNotificationViaBot({
          channelId: discordChannelId,
          sessionId: session.id,
          gameTitle: meta.gameTitle ?? "—",
          categoryTitle: meta.categoryTitle ?? "—",
          goldAmount: meta.goldAmount ?? "0",
          server: meta.server ?? "—",
          faction: meta.faction ?? "—",
          nickname: meta.nickname ?? "—",
          paymentMethod: meta.paymentMethod ?? "—",
          finalAmountCents: meta.finalAmountCents ?? String(session.amount_total ?? 0),
          currency: session.currency ?? "brl",
          email: session.customer_email ?? "—",
        });
      } catch (err) {
        // Log the error but don't return a 500 - Stripe would retry endlessly
        console.error("[Stripe Webhook] Discord bot notification failed:", err);
      }
    }
  }

  return Response.json({ received: true });
}
