import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type TimestampLike = {
  toDate?: () => Date;
};

type AgentPanelClientRow = {
  uid: string;
  username: string;
  email: string;
  lastAccessAt: string | null;
  lastPurchaseAt: string | null;
  transactionCount: number;
  totalSalesCentsByCurrency: Record<string, number>;
  totalPlatformFeeCentsByCurrency: Record<string, number>;
  totalAgentPayoutCentsByCurrency: Record<string, number>;
};

type AgentPanelTransactionRow = {
  id: string;
  orderId: string;
  customerUid: string | null;
  customerLabel: string;
  customerEmail: string;
  amountTotalCents: number;
  platformFeeCents: number;
  agentPayoutCents: number;
  currency: string;
  status: string;
  createdAt: string | null;
};

function serializeTimestamp(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as TimestampLike;
  if (typeof parsed.toDate !== "function") {
    return null;
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeCurrency(value: unknown): string {
  if (typeof value !== "string") {
    return "USD";
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return "USD";
  }

  return normalized;
}

function addCurrencyAmount(target: Record<string, number>, currency: string, cents: number) {
  const current = target[currency] ?? 0;
  target[currency] = current + Math.max(0, Math.round(cents));
}

function toSafeCents(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export async function GET(request: Request): Promise<Response> {
  try {
    const decodedToken = await requireAuthenticatedUserRequest(request);
    const adminDb = getAdminDb();

    const agentDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!agentDoc.exists) {
      return Response.json({ error: "Agent profile not found." }, { status: 404 });
    }

    const agentData = agentDoc.data() as Record<string, unknown>;
    if (agentData.isAgent !== true) {
      return Response.json({ error: "Only agent users can access this panel." }, { status: 403 });
    }

    const [clientsSnapshot, feeTransfersSnapshot] = await Promise.all([
      adminDb.collection("users").where("assignedAgentId", "==", decodedToken.uid).limit(400).get(),
      adminDb.collection("fee-transfers").where("agentUid", "==", decodedToken.uid).limit(1000).get(),
    ]);

    const clientsByUid = new Map<string, AgentPanelClientRow>();

    for (const clientDoc of clientsSnapshot.docs) {
      const data = clientDoc.data() as Record<string, unknown>;
      const username =
        typeof data.username === "string" && data.username.trim()
          ? data.username.trim()
          : typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName.trim()
          : "Cliente";
      const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

      clientsByUid.set(clientDoc.id, {
        uid: clientDoc.id,
        username,
        email,
        lastAccessAt: serializeTimestamp(data.lastAccessAt),
        lastPurchaseAt: null,
        transactionCount: 0,
        totalSalesCentsByCurrency: {},
        totalPlatformFeeCentsByCurrency: {},
        totalAgentPayoutCentsByCurrency: {},
      });
    }

    const transactions: AgentPanelTransactionRow[] = feeTransfersSnapshot.docs.map((feeDoc) => {
      const data = feeDoc.data() as Record<string, unknown>;
      const customerUid = typeof data.customerUid === "string" && data.customerUid.trim() ? data.customerUid.trim() : null;
      const customerEmail = typeof data.customerEmail === "string" ? data.customerEmail.trim().toLowerCase() : "";
      const currency = normalizeCurrency(data.currency);
      const createdAt = serializeTimestamp(data.createdAt);
      const customerClient = customerUid ? clientsByUid.get(customerUid) : null;
      const customerLabel = customerClient?.username ?? (customerUid ? customerUid : customerEmail || "Cliente");

      return {
        id: feeDoc.id,
        orderId: typeof data.orderId === "string" && data.orderId ? data.orderId : feeDoc.id,
        customerUid,
        customerLabel,
        customerEmail,
        amountTotalCents: toSafeCents(data.amountTotalCents),
        platformFeeCents: toSafeCents(data.platformFeeCents),
        agentPayoutCents: toSafeCents(data.agentPayoutCents),
        currency,
        status: typeof data.status === "string" ? data.status : "unknown",
        createdAt,
      };
    });

    for (const transaction of transactions) {
      const clientKey = transaction.customerUid || `email:${transaction.customerEmail || transaction.id}`;
      const existing = transaction.customerUid ? clientsByUid.get(transaction.customerUid) : null;

      if (existing) {
        existing.transactionCount += 1;
        addCurrencyAmount(existing.totalSalesCentsByCurrency, transaction.currency, transaction.amountTotalCents);
        addCurrencyAmount(existing.totalPlatformFeeCentsByCurrency, transaction.currency, transaction.platformFeeCents);
        addCurrencyAmount(existing.totalAgentPayoutCentsByCurrency, transaction.currency, transaction.agentPayoutCents);

        if (transaction.createdAt) {
          const currentLastPurchase = existing.lastPurchaseAt ? new Date(existing.lastPurchaseAt).getTime() : 0;
          const nextPurchase = new Date(transaction.createdAt).getTime();
          if (nextPurchase > currentLastPurchase) {
            existing.lastPurchaseAt = transaction.createdAt;
          }
        }

        continue;
      }

      const fallbackRow: AgentPanelClientRow = {
        uid: clientKey,
        username: transaction.customerLabel,
        email: transaction.customerEmail,
        lastAccessAt: null,
        lastPurchaseAt: transaction.createdAt,
        transactionCount: 1,
        totalSalesCentsByCurrency: { [transaction.currency]: transaction.amountTotalCents },
        totalPlatformFeeCentsByCurrency: { [transaction.currency]: transaction.platformFeeCents },
        totalAgentPayoutCentsByCurrency: { [transaction.currency]: transaction.agentPayoutCents },
      };

      clientsByUid.set(clientKey, fallbackRow);
    }

    const clients = Array.from(clientsByUid.values()).sort((left, right) => {
      const leftFee = Object.values(left.totalPlatformFeeCentsByCurrency).reduce((sum, value) => sum + value, 0);
      const rightFee = Object.values(right.totalPlatformFeeCentsByCurrency).reduce((sum, value) => sum + value, 0);
      return rightFee - leftFee;
    });

    transactions.sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    const totals = {
      salesByCurrency: {} as Record<string, number>,
      platformFeeByCurrency: {} as Record<string, number>,
      agentPayoutByCurrency: {} as Record<string, number>,
      transactionCount: transactions.length,
      clientsCount: clientsSnapshot.size,
    };

    for (const transaction of transactions) {
      addCurrencyAmount(totals.salesByCurrency, transaction.currency, transaction.amountTotalCents);
      addCurrencyAmount(totals.platformFeeByCurrency, transaction.currency, transaction.platformFeeCents);
      addCurrencyAmount(totals.agentPayoutByCurrency, transaction.currency, transaction.agentPayoutCents);
    }

    return Response.json({
      clients,
      transactions,
      totals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load agent panel data.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
