import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type WalletHistoryItem = {
  id: string;
  kind: "credit" | "withdrawal";
  title: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  createdAt: string | null;
};

function serializeTimestamp(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as { toDate?: () => Date };
  if (typeof parsed.toDate !== "function") {
    return null;
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function GET(request: Request): Promise<Response> {
  try {
    const decodedToken = await requireAuthenticatedUserRequest(request);
    const adminDb = getAdminDb();

    const [payoutSnapshot, withdrawSnapshot] = await Promise.all([
      adminDb
        .collection("order-payouts")
        .where("supplierUid", "==", decodedToken.uid)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
      adminDb
        .collection("withdraw-requests")
        .where("uid", "==", decodedToken.uid)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
    ]);

    const payoutItems: WalletHistoryItem[] = payoutSnapshot.docs.map((row) => {
      const data = row.data() as Record<string, unknown>;
      const amount = typeof data.payoutLootCoins === "number" && Number.isFinite(data.payoutLootCoins)
        ? data.payoutLootCoins
        : 0;
      const orderId = typeof data.orderId === "string" ? data.orderId : row.id;

      return {
        id: row.id,
        kind: "credit",
        title: `Loot Coins credited for order ${orderId}`,
        amount,
        status: "credited",
        method: null,
        reference: typeof data.reference === "string" ? data.reference : null,
        createdAt: serializeTimestamp(data.createdAt),
      };
    });

    const withdrawItems: WalletHistoryItem[] = withdrawSnapshot.docs.map((row) => {
      const data = row.data() as Record<string, unknown>;
      const amount = typeof data.amount === "number" && Number.isFinite(data.amount)
        ? data.amount
        : 0;

      return {
        id: row.id,
        kind: "withdrawal",
        title: `Withdrawal request (${typeof data.payoutMethod === "string" ? data.payoutMethod.toUpperCase() : "PAYOUT"})`,
        amount,
        status: typeof data.status === "string" ? data.status : "pending_review",
        method: typeof data.payoutMethod === "string" ? data.payoutMethod : null,
        reference: typeof data.payoutReference === "string" ? data.payoutReference : null,
        createdAt: serializeTimestamp(data.createdAt),
      };
    });

    const items = [...payoutItems, ...withdrawItems].sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    return Response.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load wallet history.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
