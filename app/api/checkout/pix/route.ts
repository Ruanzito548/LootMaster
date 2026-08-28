import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: Request): Promise<Response> {
  const paymentId = new URL(request.url).searchParams.get("payment_id")?.trim() ?? "";
  if (!/^\d+$/.test(paymentId)) return Response.json({ error: "Invalid payment ID." }, { status: 400 });

  try {
    const payment = await getMercadoPagoPayment(paymentId);
    const transactionData = (payment as typeof payment & { point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } }).point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code || !transactionData.qr_code_base64) return Response.json({ error: "PIX data is unavailable." }, { status: 404 });
    const order = payment.external_reference
      ? await getAdminDb().collection("order-checkouts").doc(payment.external_reference).get()
      : null;
    const orderData = order?.data() as Record<string, unknown> | undefined;
    return Response.json({
      status: payment.status,
      externalReference: payment.external_reference ?? "",
      deliveryMethod: typeof orderData?.deliveryMethod === "string" ? orderData.deliveryMethod : "",
      order: {
        orderId: payment.external_reference ?? "",
        gameTitle: typeof orderData?.gameTitle === "string" ? orderData.gameTitle : "",
        categoryTitle: typeof orderData?.categoryTitle === "string" ? orderData.categoryTitle : "",
        goldAmount: typeof orderData?.goldAmount === "number" ? orderData.goldAmount : null,
        server: typeof orderData?.server === "string" ? orderData.server : "",
        faction: typeof orderData?.faction === "string" ? orderData.faction : "",
        customerEmail: typeof orderData?.customerEmail === "string" ? orderData.customerEmail : "",
        amountTotalCents: typeof orderData?.amountTotalCents === "number" ? orderData.amountTotalCents : null,
        currency: typeof orderData?.currency === "string" ? orderData.currency : "brl",
      },
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64,
    });
  } catch {
    return Response.json({ error: "Could not load PIX payment." }, { status: 502 });
  }
}
