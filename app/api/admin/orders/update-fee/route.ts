import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  orderId?: string;
  commissionPercent?: number;
};

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const commissionPercentRaw = typeof body.commissionPercent === "number" ? body.commissionPercent : Number.NaN;

  if (!orderId || Number.isNaN(commissionPercentRaw)) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  const commissionPercent = clampPercent(commissionPercentRaw);

  try {
    const adminDb = getAdminDb();
    const ref = adminDb.collection("order-checkouts").doc(orderId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    const data = snapshot.data() as Record<string, unknown>;
    const amountTotalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
    const sellerAmountCents = Math.round(amountTotalCents * (1 - commissionPercent / 100));
    const platformProfitCents = amountTotalCents - sellerAmountCents;

    await ref.set(
      {
        commissionPercent,
        sellerAmountCents,
        platformProfitCents,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return Response.json({
      ok: true,
      commissionPercent,
      sellerAmountCents,
      platformProfitCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update order fee.";
    return Response.json({ error: message }, { status: 500 });
  }
}
