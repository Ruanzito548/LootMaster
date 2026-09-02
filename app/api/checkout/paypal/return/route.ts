import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase-admin";
import { capturePayPalOrder } from "@/lib/paypal";
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

function asMetadata(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean").map(([key, value]) => [key, String(value)]),
  );
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const paypalOrderId = url.searchParams.get("token")?.trim() ?? "";
  if (!paypalOrderId) return NextResponse.redirect(new URL("/checkout/cancel?error=paypal_missing_order", request.url));

  const db = getAdminDb();
  const orderSnapshot = await db.collection("order-checkouts").where("paypalOrderId", "==", paypalOrderId).limit(1).get();
  if (orderSnapshot.empty) return NextResponse.redirect(new URL("/checkout/cancel?error=paypal_order_not_found", request.url));

  const orderRef = orderSnapshot.docs[0].ref;
  const orderData = orderSnapshot.docs[0].data() as Record<string, unknown>;
  if (orderData.paymentStatus === "paid") {
    return NextResponse.redirect(new URL(`/checkout/success?session_id=${encodeURIComponent(String(orderData.orderId))}&delivery_method=${encodeURIComponent(String(orderData.deliveryMethod ?? ""))}`, request.url));
  }

  try {
    const captured = await capturePayPalOrder(paypalOrderId);
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (captured.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
      return NextResponse.redirect(new URL("/checkout/cancel?error=paypal_not_completed", request.url));
    }

    const amount = Number(capture.amount?.value ?? 0);
    const expectedAmount = Number(orderData.amountTotalCents ?? 0) / 100;
    if (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.01 || capture.amount?.currency_code !== String(orderData.currency ?? "").toUpperCase()) {
      await orderRef.set({ paymentStatus: "rejected", orderStatus: "payment_mismatch", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return NextResponse.redirect(new URL("/checkout/cancel?error=paypal_payment_mismatch", request.url));
    }

    const metadata = asMetadata(orderData);
    const currencyCode = String(orderData.currency ?? "usd").toLowerCase();
    const session = {
      id: String(orderData.orderId),
      amount_total: Math.round(amount * 100),
      currency: currencyCode,
      customer_email: String(orderData.customerEmail ?? ""),
      payment_status: "paid",
      created: Math.floor(Date.now() / 1000),
      metadata,
      customer_details: { name: "" },
    } as unknown as Stripe.Checkout.Session;
    const supplierPercentage = await resolveSessionSupplierPercent(session);
    await persistPaidOrder(session, supplierPercentage);
    await maybeBindFirstPurchaseAgent(session);
    await processFeeTransfer(session);
    await applyPurchaseLevelRewards(session);
    await orderRef.set({ paymentStatus: "paid", orderStatus: "paid", paypalCaptureId: capture.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    const meta = session.metadata ?? {};
  const supplierGoldCents = resolveOrderCouponContext(meta).goldValueCents ?? Number(meta.baseProductCents ?? 0);
  const supplierPayoutCents = Math.max(0, supplierGoldCents * supplierPercentage / 100);
    await syncPaidOrderToWalletBackend({
      orderId: session.id,
      customerId: session.customer_email ?? null,
      totalAmount: amount,
      supplierPayout: supplierPayoutCents / 100,
      currency: currencyCode.toUpperCase(),
      metadata: { gameId: meta.gameId ?? "", gameTitle: meta.gameTitle ?? "", categoryId: meta.categoryId ?? "", categoryTitle: meta.categoryTitle ?? "", server: meta.server ?? "", faction: meta.faction ?? "", nickname: meta.nickname ?? "", goldAmount: Number(meta.goldAmount ?? 0) || 0 },
    });

    if (await isDiscordAutoSendEnabled()) {
      await sendOrderNotificationViaBot({
        gameId: meta.gameId ?? "",
        channelId: await resolveDiscordChannelId(meta.gameId ?? "", meta.categoryId ?? "gold"),
        sessionId: session.id,
        gameTitle: meta.gameTitle ?? "-",
        categoryTitle: meta.categoryTitle ?? "-",
        goldAmount: meta.goldAmount ?? "0",
        serverId: meta.serverId ?? "",
        server: meta.server ?? "-",
        faction: meta.faction ?? "-",
        nickname: meta.nickname ?? "-",
        paymentMethod: "paypal",
        finalAmountCents: String(session.amount_total),
        supplierPayoutCents: String(supplierPayoutCents),
        currency: currencyCode,
        email: session.customer_email ?? "-",
      });
    }

    return NextResponse.redirect(new URL(`/checkout/success?session_id=${encodeURIComponent(session.id)}&delivery_method=${encodeURIComponent(String(meta.deliveryMethod ?? ""))}`, request.url));
  } catch (error) {
    console.error("[PayPal Return] Could not capture/process order:", error);
    return NextResponse.redirect(new URL("/checkout/cancel?error=paypal_capture_failed", request.url));
  }
}
