import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getMercadoPagoPayment, verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago";
import {
  applyPurchaseLevelRewards,
  maybeBindFirstPurchaseAgent,
  persistPaidOrder,
  processFeeTransfer,
  resolveSessionSupplierPercent,
} from "@/app/api/webhook/route";
import { resolveDiscordChannelId } from "@/lib/discord-channel-resolver";
import { isDiscordAutoSendEnabled } from "@/lib/discord-settings";
import { sendOrderNotificationViaBot } from "@/lib/discord-bot";
import { resolveOrderCouponContext } from "@/lib/order-financials";
import { syncPaidOrderToWalletBackend } from "@/lib/wallet-backend";
import type Stripe from "stripe";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return Response.json({ error: "Mercado Pago webhook is not configured." }, { status: 503 });

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const signature = request.headers.get("x-signature") ?? "";

  if (!dataId || !requestId || !verifyMercadoPagoWebhookSignature({ dataId, requestId, signature, secret })) {
    return Response.json({ error: "Invalid Mercado Pago webhook signature." }, { status: 401 });
  }

  let payment;
  try {
    payment = await getMercadoPagoPayment(dataId);
  } catch (error) {
    console.error("[Mercado Pago Webhook] Could not retrieve payment:", error);
    return Response.json({ error: "Could not retrieve payment." }, { status: 502 });
  }

  if (payment.status !== "approved" || !payment.external_reference) {
    return Response.json({ received: true });
  }

  const orderId = payment.external_reference;
  const adminDb = getAdminDb();
  const eventRef = adminDb.collection("payment-events").doc(`mercadopago_${payment.id}`);
  const claimed = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (snapshot.exists && snapshot.data()?.status === "completed") return false;
    transaction.set(eventRef, { provider: "mercadopago", paymentId: payment.id, orderId, status: "processing", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!claimed) return Response.json({ received: true });

  const order = await adminDb.collection("order-checkouts").doc(orderId).get();
  const orderData = order.data() as Record<string, unknown> | undefined;
  if (!orderData) return Response.json({ error: "Order not found." }, { status: 404 });

  const orderEmail = String(orderData.customerEmail ?? orderData.email ?? payment.payer?.email ?? "").trim().toLowerCase();
  const payerName = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ").trim();
  const orderMetadata = Object.fromEntries(
    Object.entries(orderData)
      .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      .map(([key, value]) => [key, String(value)]),
  );
  if (orderEmail) {
    orderMetadata.email = orderEmail;
  }

  const session = {
    id: orderId,
    amount_total: payment.transaction_amount * 100,
    currency: "brl",
    customer_email: orderEmail,
    customer_details: { name: String(orderData.customerName ?? payerName) },
    payment_status: "paid",
    created: payment.date_created ? Math.floor(new Date(payment.date_created).getTime() / 1000) : Math.floor(Date.now() / 1000),
    metadata: orderMetadata,
  } as unknown as Stripe.Checkout.Session;

  try {
    const supplierPercentage = await resolveSessionSupplierPercent(session);
    await persistPaidOrder(session, supplierPercentage);
    await maybeBindFirstPurchaseAgent(session);
    await processFeeTransfer(session);
    await applyPurchaseLevelRewards(session);
    const meta = session.metadata ?? {};
    const supplierGoldCents = resolveOrderCouponContext(meta).goldValueCents ?? Number(meta.baseProductCents ?? 0);
    const supplierPayoutCents = Math.max(0, supplierGoldCents * supplierPercentage / 100);
    await syncPaidOrderToWalletBackend({
      orderId,
      customerId: session.customer_email ?? null,
      totalAmount: (payment.transaction_amount ?? 0),
      supplierPayout: supplierPayoutCents / 100,
      currency: "BRL",
      metadata: { gameId: meta.gameId ?? "", gameTitle: meta.gameTitle ?? "", categoryId: meta.categoryId ?? "", categoryTitle: meta.categoryTitle ?? "", server: meta.server ?? "", faction: meta.faction ?? "", nickname: meta.nickname ?? "", goldAmount: Number(meta.goldAmount ?? 0) || 0 },
    });

    if (await isDiscordAutoSendEnabled()) {
      await sendOrderNotificationViaBot({
        gameId: meta.gameId ?? "",
        channelId: await resolveDiscordChannelId(meta.gameId ?? "", meta.categoryId ?? "gold"),
        sessionId: orderId,
        gameTitle: meta.gameTitle ?? "-",
        categoryTitle: meta.categoryTitle ?? "-",
        goldAmount: meta.goldAmount ?? "0",
        serverId: meta.serverId ?? "",
        server: meta.server ?? "-",
        faction: meta.faction ?? "-",
        nickname: meta.nickname ?? "-",
        paymentMethod: "pix",
        finalAmountCents: String(payment.transaction_amount * 100),
        supplierPayoutCents: String(supplierPayoutCents),
        currency: "brl",
        email: session.customer_email ?? "-",
      });
    }

    await eventRef.set({ status: "completed", completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("[Mercado Pago Webhook] Could not process approved payment:", error);
    return Response.json({ error: "Payment processing failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
