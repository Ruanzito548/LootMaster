import Stripe from "stripe";

import { sendDiscordOrderNotification } from "@/lib/discord";

/**
 * Stripe webhook endpoint.
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY              — Stripe secret API key
 *   STRIPE_WEBHOOK_SECRET          — Signing secret from the webhook endpoint in the Stripe dashboard
 *
 * Discord webhook URLs (one per game+category combination):
 *   DISCORD_WEBHOOK_WOW_TBC_GOLD   — WoW TBC Anniversary gold sales
 *   DISCORD_WEBHOOK_DEFAULT        — (optional) catch-all for unmatched orders
 *
 * Register this endpoint in the Stripe dashboard (or Stripe CLI for local testing):
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *
 * Events handled:
 *   checkout.session.completed  (payment_status === "paid")
 */

/**
 * Returns the correct Discord webhook URL for a given gameId + categoryId pair.
 * Add new entries here whenever a new channel is configured.
 */
function resolveDiscordWebhookUrl(gameId: string, categoryId: string): string | null {
  const key = `${gameId}::${categoryId}`;
  const map: Record<string, string | undefined> = {
    "tbc-anniversary::gold": process.env.DISCORD_WEBHOOK_WOW_TBC_GOLD,
    // Add more mappings as needed, e.g.:
    // "wow-retail::gold": process.env.DISCORD_WEBHOOK_WOW_RETAIL_GOLD,
  };
  return map[key] ?? process.env.DISCORD_WEBHOOK_DEFAULT ?? null;
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
      const discordUrl = resolveDiscordWebhookUrl(
        meta.gameId ?? "",
        meta.categoryId ?? meta.categoryTitle?.toLowerCase() ?? "",
      );

      try {
        await sendDiscordOrderNotification(discordUrl, {
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
        // Log the error but don't return a 500 — Stripe would retry endlessly
        console.error("[Stripe Webhook] Discord notification failed:", err);
      }
    }
  }

  return Response.json({ received: true });
}
