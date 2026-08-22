import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { resolveDiscordChannelId } from "@/lib/discord-channel-resolver";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  orderId: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as RequestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: status === 401 ? "Unauthorized request." : "Invalid request body." }, { status });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return Response.json({ error: "Missing orderId." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const dispatchSnapshot = await adminDb.collection("order-dispatches").doc(orderId).get();

    if (dispatchSnapshot.exists) {
      const dispatchData = dispatchSnapshot.data() as Record<string, unknown>;
      const status = typeof dispatchData.status === "string" ? dispatchData.status : "assigned";

      if (status === "completed") {
        return Response.json({ error: "Order is already completed." }, { status: 409 });
      }
    }

    const orderSnapshot = await adminDb.collection("order-checkouts").doc(orderId).get();

    if (!orderSnapshot.exists) {
      return Response.json({ error: "Order not found in order-checkouts." }, { status: 404 });
    }

    const orderData = orderSnapshot.data() as Record<string, unknown>;
    const gameId = typeof orderData.gameId === "string" ? orderData.gameId : "";
    const categoryId = typeof orderData.categoryId === "string" ? orderData.categoryId : "";

    const channelId = await resolveDiscordChannelId(gameId, categoryId);

    if (!channelId) {
      return Response.json(
        { error: "No Discord channel is configured for this game/category. Check DISCORD_CHANNEL_* or DISCORD_WEBHOOK_* env vars." },
        { status: 422 },
      );
    }

    const notification = await sendOrderNotificationViaBot({
      channelId,
      sessionId: orderId,
      gameTitle: typeof orderData.gameTitle === "string" ? orderData.gameTitle : "—",
      categoryTitle: typeof orderData.categoryTitle === "string" ? orderData.categoryTitle : "—",
      goldAmount: String(typeof orderData.goldAmount === "number" ? orderData.goldAmount : 0),
      server: typeof orderData.server === "string" ? orderData.server : "—",
      faction: typeof orderData.faction === "string" ? orderData.faction : "—",
      nickname: typeof orderData.nickname === "string" ? orderData.nickname : "—",
      paymentMethod: typeof orderData.paymentMethod === "string" ? orderData.paymentMethod : "—",
      finalAmountCents: String(
        typeof orderData.finalAmountCents === "number"
          ? orderData.finalAmountCents
          : typeof orderData.amountTotalCents === "number"
          ? orderData.amountTotalCents
          : 0,
      ),
      supplierPayoutCents: String(
        typeof orderData.supplierPayout === "number"
          ? orderData.supplierPayout
          : typeof orderData.sellerAmountCents === "number"
          ? orderData.sellerAmountCents
          : 0,
      ),
      currency: typeof orderData.currency === "string" ? orderData.currency : "brl",
      email: typeof orderData.customerEmail === "string" ? orderData.customerEmail : "—",
    });

    if (!notification) {
      return Response.json({ error: "Discord did not confirm the message was posted." }, { status: 502 });
    }

    await adminDb.collection("order-checkouts").doc(orderId).set(
      {
        discordNotificationChannelId: notification.channelId,
        discordNotificationMessageId: notification.messageId,
      },
      { merge: true },
    );

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resend order to Discord.";
    return Response.json({ error: message }, { status: 500 });
  }
}
