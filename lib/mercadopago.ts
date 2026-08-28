import crypto from "node:crypto";

export type MercadoPagoPixPayment = {
  id: string;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
  payer?: { email?: string; first_name?: string; last_name?: string; identification?: { type?: string; number?: string } };
  date_created?: string;
};

type MercadoPagoPaymentResponse = MercadoPagoPixPayment & {
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("Mercado Pago is not configured.");
  }
  return token;
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as T | { message?: string; error?: string } | null;
  if (!response.ok) {
    const rawMessage = payload && typeof payload === "object" && ("message" in payload || "error" in payload)
      ? String((payload as { message?: string; error?: string }).message ?? (payload as { error?: string }).error)
      : "Mercado Pago request failed.";
    if (rawMessage.toLowerCase().includes("without key enabled") || rawMessage.toLowerCase().includes("qr render")) {
      throw new Error("Mercado Pago PIX is not enabled for this account. Register and enable a PIX key in the receiving Mercado Pago account.");
    }
    throw new Error(rawMessage);
  }

  return payload as T;
}

export async function createMercadoPagoPixPayment(input: {
  amountCents: number;
  email: string;
  externalReference: string;
  metadata: Record<string, string>;
  notificationUrl: string;
}) {
  const payment = await mercadoPagoRequest<MercadoPagoPaymentResponse>("/v1/payments", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": input.externalReference,
    },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: "Loot Master gaming service",
      payment_method_id: "pix",
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      payer: { email: input.email },
      metadata: input.metadata,
    }),
  });

  const transactionData = payment.point_of_interaction?.transaction_data;
  if (!payment.id || !transactionData?.qr_code || !transactionData.qr_code_base64) {
    throw new Error("Mercado Pago did not return PIX QR data. Confirm that a PIX key is enabled for the receiving account.");
  }

  return {
    id: payment.id,
    status: payment.status,
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
  };
}

export function verifyMercadoPagoWebhookSignature(input: {
  dataId: string;
  requestId: string;
  signature: string;
  secret: string;
}) {
  const [tsPart, v1Part] = input.signature.split(",").map((part) => part.trim().split("="));
  const timestamp = tsPart?.[0] === "ts" ? tsPart[1] : undefined;
  const receivedHash = v1Part?.[0] === "v1" ? v1Part[1] : undefined;
  if (!timestamp || !receivedHash) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
  return manifest.length > 0 && receivedHash.length === 64 && timingSafeEqualHex(
    hmacSha256(input.secret, manifest),
    receivedHash,
  );
}

function hmacSha256(secret: string, value: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function getMercadoPagoPayment(paymentId: string) {
  return mercadoPagoRequest<MercadoPagoPixPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}
