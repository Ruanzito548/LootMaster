import { getAdminDb } from "@/lib/firebase-admin";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";
import { computeOrderFinancials } from "@/lib/order-financials";

const games = [
  { gameId: "tbc-anniversary", gameTitle: "WoW TBC Anniversary", categoryId: "gold", categoryTitle: "Gold" },
  { gameId: "retail", gameTitle: "WoW Retail", categoryId: "gold", categoryTitle: "Gold" },
  { gameId: "classic-era", gameTitle: "WoW Classic Era", categoryId: "gold", categoryTitle: "Gold" },
  { gameId: "mist-of-pandaria", gameTitle: "WoW Mist of Pandaria", categoryId: "gold", categoryTitle: "Gold" },
];

const servers = ["Whitemane", "Faerlina", "Pagle", "Stormrage"];
const factions = ["Alliance", "Horde"];
const nicknames = ["TestMage", "DummyWarrior", "SandboxRogue", "AlphaPaladin"];

function pickOne<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resolveTestChannelId(gameId: string, categoryId: string): string | null {
  const key = `${gameId}::${categoryId}`;
  const channelMap: Record<string, string | undefined> = {
    "tbc-anniversary::gold": process.env.DISCORD_CHANNEL_WOW_TBC_GOLD,
    "retail::gold": process.env.DISCORD_CHANNEL_WOW_RETAIL_GOLD,
    "classic-era::gold": process.env.DISCORD_CHANNEL_WOW_CLASSIC_GOLD,
    "mist-of-pandaria::gold": process.env.DISCORD_CHANNEL_WOW_PANDARIA_GOLD,
  };

  return channelMap[key] ?? process.env.DISCORD_CHANNEL_DEFAULT ?? null;
}

type CreateTestOrderBody = {
  currency?: string;
};

function normalizeCurrency(value: unknown): "brl" | "usd" | "eur" {
  if (typeof value !== "string") return "brl";

  const normalized = value.trim().toLowerCase();
  if (normalized === "usd" || normalized === "eur") {
    return normalized;
  }

  return "brl";
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);
    const body = (await request.json().catch(() => ({}))) as CreateTestOrderBody;
    const selectedCurrency = normalizeCurrency(body.currency);

    const now = new Date();
    const game = pickOne(games);
    const goldAmount = randomInt(1000, 20000);
    const pricePerThousand = randomInt(8, 20);
    const amountTotalCents = Math.round((goldAmount / 1000) * pricePerThousand * 100);
    const suffix = Math.random().toString(36).slice(2, 8);
    const orderId = `test_${Date.now()}_${suffix}`;
    const adminDb = getAdminDb();

    let supplierPercentage = buildDefaultSiteFeeSettings().supplierDefaultPercent;
    let cardFeePercent = buildDefaultSiteFeeSettings().cardGatewayFeePercent;
    let cashbackPercent = buildDefaultSiteFeeSettings().cashbackPercent;
    let operationalReservePercent = buildDefaultSiteFeeSettings().operationalReservePercent;
    try {
      const siteFeeSnapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
      const siteFees = siteFeeSnapshot.exists
        ? sanitizeSiteFeeSettings(siteFeeSnapshot.data())
        : buildDefaultSiteFeeSettings();
      supplierPercentage = siteFees.supplierDefaultPercent;
      cardFeePercent = siteFees.cardGatewayFeePercent;
      cashbackPercent = siteFees.cashbackPercent;
      operationalReservePercent = siteFees.operationalReservePercent;
    } catch {
      const defaults = buildDefaultSiteFeeSettings();
      supplierPercentage = defaults.supplierDefaultPercent;
      cardFeePercent = defaults.cardGatewayFeePercent;
      cashbackPercent = defaults.cashbackPercent;
      operationalReservePercent = defaults.operationalReservePercent;
    }

    const financials = computeOrderFinancials(
      amountTotalCents,
      supplierPercentage,
      cardFeePercent,
      cashbackPercent,
      operationalReservePercent,
    );

    const payload = {
      orderId,
      paymentStatus: "paid",
      orderStatus: "paid",
      amountTotalCents,
      finalAmountCents: amountTotalCents,
      currency: selectedCurrency,
      customerEmail: `test+${suffix}@lootmaster.local`,
      gameId: game.gameId,
      gameTitle: game.gameTitle,
      categoryId: game.categoryId,
      categoryTitle: game.categoryTitle,
      goldAmount,
      pricePerThousand,
      serverId: pickOne(servers).toLowerCase(),
      server: pickOne(servers),
      faction: pickOne(factions),
      deliveryMethod: "mail",
      nickname: pickOne(nicknames),
      paymentMethod: selectedCurrency === "brl" ? "pix" : "card",
      hasServerOptions: true,
      supplierId: "",
      supplierName: "",
      supplierPercentage: financials.supplierPercentage,
      grossRevenue: financials.grossRevenue,
      supplierPayout: financials.supplierPayout,
      grossProfit: financials.grossProfit,
      cardFee: financials.cardFee,
      cashback: financials.cashback,
      operationalReserve: financials.operationalReserve,
      netProfit: financials.netProfit,
      cardFeePercent,
      cashbackPercent,
      operationalReservePercent,
      commissionPercent: Math.max(0, 100 - financials.supplierPercentage),
      sellerAmountCents: financials.supplierPayout,
      platformProfitCents: financials.netProfit,
      stripeCreatedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isTestOrder: true,
    };

    await adminDb.collection("order-checkouts").doc(orderId).set(payload, { merge: true });

    try {
      const notification = await sendOrderNotificationViaBot({
        channelId: resolveTestChannelId(game.gameId, game.categoryId),
        sessionId: orderId,
        gameTitle: game.gameTitle,
        categoryTitle: game.categoryTitle,
        goldAmount: String(goldAmount),
        server: payload.server,
        faction: payload.faction,
        nickname: payload.nickname,
        paymentMethod: payload.paymentMethod,
        finalAmountCents: String(amountTotalCents),
        supplierPayoutCents: String(financials.supplierPayout),
        currency: payload.currency,
        email: payload.customerEmail,
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
      console.error("[Create Test Order] Could not send Discord notification:", error);
    }

    return Response.json({ ok: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create test order.";
    return Response.json({ error: message }, { status: 500 });
  }
}
