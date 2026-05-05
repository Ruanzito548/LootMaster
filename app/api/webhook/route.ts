import Stripe from "stripe";

import { sendOrderNotificationViaBot } from "@/lib/discord-bot";

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

function buildSupplierApplyUrl(params: {
  sessionId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: string;
  server: string;
  faction: string;
  nickname: string;
  finalAmountCents: string;
  currency: string;
}): string {
  const baseUrl = process.env.APP_URL ?? "https://lootmaster.vercel.app";
  const search = new URLSearchParams({
    orderId: params.sessionId,
    gameTitle: params.gameTitle,
    categoryTitle: params.categoryTitle,
    goldAmount: params.goldAmount,
    server: params.server,
    faction: params.faction,
    nickname: params.nickname,
    finalAmountCents: params.finalAmountCents,
    currency: params.currency,
  });

  return `${baseUrl}/suppliers/apply?${search.toString()}`;
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

    // Only notify for fully paid sessions
    if (session.payment_status === "paid") {
      const meta = session.metadata ?? {};
      const discordChannelId = await resolveDiscordChannelId(
        meta.gameId ?? "",
        meta.categoryId ?? meta.categoryTitle?.toLowerCase() ?? "",
      );
      const applyUrl = buildSupplierApplyUrl({
        sessionId: session.id,
        gameTitle: meta.gameTitle ?? "-",
        categoryTitle: meta.categoryTitle ?? "-",
        goldAmount: meta.goldAmount ?? "0",
        server: meta.server ?? "-",
        faction: meta.faction ?? "-",
        nickname: meta.nickname ?? "-",
        finalAmountCents: meta.finalAmountCents ?? String(session.amount_total ?? 0),
        currency: session.currency ?? "brl",
      });

      try {
        await sendOrderNotificationViaBot({
          channelId: discordChannelId,
          applyUrl,
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
