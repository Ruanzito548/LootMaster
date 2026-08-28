export type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: Array<{ id: string; status: string; amount?: { currency_code?: string; value?: string } }> };
  }>;
  payer?: { name?: { given_name?: string; surname?: string }; email_address?: string };
  links?: Array<{ href: string; rel: string; method?: string }>;
};

function getPayPalBaseUrl() {
  return process.env.PAYPAL_ENVIRONMENT?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("PayPal is not configured.");
  return { clientId, clientSecret };
}

async function getAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
  if (!response.ok || !payload?.access_token) throw new Error(payload?.error_description ?? "PayPal authentication failed.");
  return payload.access_token;
}

async function paypalRequest<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as T & { message?: string; details?: Array<{ issue?: string }> };
  if (!response.ok) {
    const detail = payload?.details?.map((item) => item.issue).filter(Boolean).join(", ");
    throw new Error(detail || payload?.message || "PayPal request failed.");
  }
  return payload;
}

export async function createPayPalOrder(input: {
  amount: number;
  currency: "USD" | "EUR";
  orderId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}) {
  const order = await paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": input.orderId },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: input.orderId,
        custom_id: input.orderId,
        description: input.description.slice(0, 127),
        amount: { currency_code: input.currency, value: input.amount.toFixed(2) },
      }],
      application_context: {
        brand_name: "Loot Master",
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
  const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href;
  if (!order.id || !approvalUrl) throw new Error("PayPal approval URL was not returned.");
  return { id: order.id, approvalUrl };
}

export async function capturePayPalOrder(orderId: string) {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": `capture_${orderId}` },
    body: "{}",
  });
}
