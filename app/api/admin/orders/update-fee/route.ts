import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { computeOrderFinancials } from "@/lib/order-financials";
import { clampPercent } from "@/lib/percent-utils";

type RequestBody = {
  orderId?: string;
  supplierName?: string;
  supplierPercentage?: number;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Unauthorized request." }, { status: 401 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const supplierPercentageRaw = typeof body.supplierPercentage === "number" ? body.supplierPercentage : Number.NaN;
  const supplierName = typeof body.supplierName === "string" ? body.supplierName.trim() : "";

  if (!orderId || Number.isNaN(supplierPercentageRaw)) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  const supplierPercentage = clampPercent(supplierPercentageRaw);

  try {
    const adminDb = getAdminDb();
    const ref = adminDb.collection("order-checkouts").doc(orderId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    const data = snapshot.data() as Record<string, unknown>;
    const amountTotalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
    const cardFeePercent = typeof data.cardFeePercent === "number" ? data.cardFeePercent : 0;
    const cashbackPercent = typeof data.cashbackPercent === "number" ? data.cashbackPercent : 0;
    const operationalReservePercent = typeof data.operationalReservePercent === "number" ? data.operationalReservePercent : 0;
    const financials = computeOrderFinancials(
      amountTotalCents,
      supplierPercentage,
      cardFeePercent,
      cashbackPercent,
      operationalReservePercent,
    );

    await ref.set(
      {
        supplierName,
        supplierPercentage: financials.supplierPercentage,
        grossRevenue: financials.grossRevenue,
        supplierPayout: financials.supplierPayout,
        grossProfit: financials.grossProfit,
        cardFee: financials.cardFee,
        cashback: financials.cashback,
        operationalReserve: financials.operationalReserve,
        netProfit: financials.netProfit,
        // Legacy aliases
        commissionPercent: Math.max(0, 100 - financials.supplierPercentage),
        sellerAmountCents: financials.supplierPayout,
        platformProfitCents: financials.netProfit,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return Response.json({
      ok: true,
      supplierName,
      supplierPercentage: financials.supplierPercentage,
      supplierPayout: financials.supplierPayout,
      grossProfit: financials.grossProfit,
      netProfit: financials.netProfit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update order supplier settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}
