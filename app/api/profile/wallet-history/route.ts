import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type WalletHistoryItem = {
  id: string;
  kind: "credit" | "withdrawal" | "purchase" | "fee";
  direction: "in" | "out" | "info";
  title: string;
  amount: number;
  unit: "loot" | "usd";
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
    const userEmail = (decodedToken.email ?? "").trim().toLowerCase();

    const [payoutSnapshot, withdrawSnapshot, agentFeesSnapshot, customerFeesSnapshot, checkoutByUidSnapshot, checkoutByEmailSnapshot] = await Promise.all([
      adminDb
        .collection("order-payouts")
        .where("supplierUid", "==", decodedToken.uid)
        .limit(300)
        .get(),
      adminDb
        .collection("withdraw-requests")
        .where("uid", "==", decodedToken.uid)
        .limit(300)
        .get(),
      adminDb
        .collection("fee-transfers")
        .where("agentUid", "==", decodedToken.uid)
        .limit(300)
        .get(),
      adminDb
        .collection("fee-transfers")
        .where("customerUid", "==", decodedToken.uid)
        .limit(300)
        .get(),
      adminDb
        .collection("order-checkouts")
        .where("customerUid", "==", decodedToken.uid)
        .limit(300)
        .get(),
      userEmail
        ? adminDb
            .collection("order-checkouts")
            .where("customerEmail", "==", userEmail)
            .limit(300)
            .get()
        : Promise.resolve(null),
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
        direction: "in",
        title: `Loot Coins credited for order ${orderId}`,
        amount,
        unit: "loot",
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
        direction: "out",
        title: `Withdrawal request (${typeof data.payoutMethod === "string" ? data.payoutMethod.toUpperCase() : "PAYOUT"})`,
        amount,
        unit: "loot",
        status: typeof data.status === "string" ? data.status : "pending_review",
        method: typeof data.payoutMethod === "string" ? data.payoutMethod : null,
        reference: typeof data.payoutReference === "string" ? data.payoutReference : null,
        createdAt: serializeTimestamp(data.createdAt),
      };
    });

    const agentFeeItems: WalletHistoryItem[] = agentFeesSnapshot.docs.map((row) => {
      const data = row.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" ? data.orderId : row.id;
      const amount = typeof data.agentPayoutLootCoins === "number" && Number.isFinite(data.agentPayoutLootCoins)
        ? data.agentPayoutLootCoins
        : typeof data.agentPayoutCents === "number" && Number.isFinite(data.agentPayoutCents)
        ? Math.round((data.agentPayoutCents / 100) * 100) / 100
        : 0;

      return {
        id: `agent-fee-${row.id}`,
        kind: "fee",
        direction: "in",
        title: `Agent fee payout for order ${orderId}`,
        amount,
        unit: "loot",
        status: typeof data.status === "string" ? data.status : "pending_completion",
        method: null,
        reference: orderId,
        createdAt: serializeTimestamp(data.createdAt),
      };
    });

    const customerFeeItems: WalletHistoryItem[] = customerFeesSnapshot.docs.map((row) => {
      const data = row.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" ? data.orderId : row.id;
      const amount = typeof data.platformFeeCents === "number" && Number.isFinite(data.platformFeeCents)
        ? data.platformFeeCents / 100
        : 0;

      return {
        id: `customer-fee-${row.id}`,
        kind: "fee",
        direction: "out",
        title: `Platform fee charged on order ${orderId}`,
        amount,
        unit: "usd",
        status: typeof data.status === "string" ? data.status : "processed",
        method: null,
        reference: orderId,
        createdAt: serializeTimestamp(data.createdAt),
      };
    });

    const checkoutDocs = new Map<string, Record<string, unknown>>();
    for (const docRow of checkoutByUidSnapshot.docs) {
      checkoutDocs.set(docRow.id, docRow.data() as Record<string, unknown>);
    }

    if (checkoutByEmailSnapshot) {
      for (const docRow of checkoutByEmailSnapshot.docs) {
        if (!checkoutDocs.has(docRow.id)) {
          checkoutDocs.set(docRow.id, docRow.data() as Record<string, unknown>);
        }
      }
    }

    const purchaseItems: WalletHistoryItem[] = Array.from(checkoutDocs.entries()).map(([docId, data]) => {
      const amountTotalCents =
        typeof data.amountTotalCents === "number" && Number.isFinite(data.amountTotalCents)
          ? data.amountTotalCents
          : 0;
      const gameTitle = typeof data.gameTitle === "string" && data.gameTitle ? data.gameTitle : "Game";
      const categoryTitle = typeof data.categoryTitle === "string" && data.categoryTitle ? data.categoryTitle : "Service";
      const orderId = typeof data.orderId === "string" ? data.orderId : docId;

      return {
        id: `purchase-${docId}`,
        kind: "purchase",
        direction: "out",
        title: `Purchase: ${gameTitle} / ${categoryTitle}`,
        amount: amountTotalCents / 100,
        unit: "usd",
        status: typeof data.paymentStatus === "string" ? data.paymentStatus : "unknown",
        method: typeof data.paymentMethod === "string" ? data.paymentMethod : null,
        reference: orderId,
        createdAt:
          typeof data.stripeCreatedAt === "string"
            ? data.stripeCreatedAt
            : typeof data.updatedAt === "string"
            ? data.updatedAt
            : null,
      };
    });

    const items = [
      ...payoutItems,
      ...withdrawItems,
      ...agentFeeItems,
      ...customerFeeItems,
      ...purchaseItems,
    ].sort((left, right) => {
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
