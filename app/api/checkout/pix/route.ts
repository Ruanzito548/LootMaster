import { getMercadoPagoPayment } from "@/lib/mercadopago";

export async function GET(request: Request): Promise<Response> {
  const paymentId = new URL(request.url).searchParams.get("payment_id")?.trim() ?? "";
  if (!/^\d+$/.test(paymentId)) return Response.json({ error: "Invalid payment ID." }, { status: 400 });

  try {
    const payment = await getMercadoPagoPayment(paymentId);
    const transactionData = (payment as typeof payment & { point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } }).point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code || !transactionData.qr_code_base64) return Response.json({ error: "PIX data is unavailable." }, { status: 404 });
    return Response.json({
      status: payment.status,
      externalReference: payment.external_reference ?? "",
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64,
    });
  } catch {
    return Response.json({ error: "Could not load PIX payment." }, { status: 502 });
  }
}
