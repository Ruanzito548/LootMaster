import { getAdminDb } from "@/lib/firebase-admin";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";

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

export async function POST(): Promise<Response> {
  try {
    const now = new Date();
    const game = pickOne(games);
    const goldAmount = randomInt(1000, 20000);
    const pricePerThousand = randomInt(8, 20);
    const amountTotalCents = Math.round((goldAmount / 1000) * pricePerThousand * 100);
    const suffix = Math.random().toString(36).slice(2, 8);
    const orderId = `test_${Date.now()}_${suffix}`;

    const payload = {
      orderId,
      paymentStatus: "paid",
      orderStatus: "paid",
      amountTotalCents,
      finalAmountCents: amountTotalCents,
      currency: "brl",
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
      paymentMethod: "pix",
      hasServerOptions: true,
      stripeCreatedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isTestOrder: true,
    };

    const adminDb = getAdminDb();
    await adminDb.collection("order-checkouts").doc(orderId).set(payload, { merge: true });

    try {
      await sendOrderNotificationViaBot({
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
        currency: payload.currency,
        email: payload.customerEmail,
      });
    } catch (error) {
      console.error("[Create Test Order] Could not send Discord notification:", error);
    }

    return Response.json({ ok: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create test order.";
    return Response.json({ error: message }, { status: 500 });
  }
}
