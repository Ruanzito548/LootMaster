import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { convertCentsToUsdCents, getUsdRates, normalizeCurrency } from "@/lib/currency-conversion";

import type { OrderRow } from "@/app/admin/orders/export-button";

type OrdersStatusFilter = "all" | "open" | "completed";

function formatIsoDate(iso: string | null | undefined) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US");
}

function normalizeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(10, Math.min(100, parsed));
}

function normalizeStatus(value: string | null): OrdersStatusFilter {
  if (value === "open" || value === "completed") {
    return value;
  }

  return "all";
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor")?.trim() || null;
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const statusFilter = normalizeStatus(url.searchParams.get("status"));
    const adminDb = getAdminDb();
    const usdRates = await getUsdRates();

    let query = adminDb.collection("order-checkouts").orderBy("updatedAt", "desc").limit(limit);

    if (cursor) {
      const cursorRef = adminDb.collection("order-checkouts").doc(cursor);
      const cursorSnapshot = await cursorRef.get();
      if (cursorSnapshot.exists) {
        query = query.startAfter(cursorSnapshot);
      }
    }

    const snapshot = await query.get();
    const orderDocs = snapshot.docs;

    const assignedAgentIds = Array.from(
      new Set(
        orderDocs
          .map((docRow) => {
            const data = docRow.data() as Record<string, unknown>;
            return typeof data.assignedAgentId === "string" ? data.assignedAgentId.trim() : "";
          })
          .filter((value) => value.length > 0),
      ),
    );

    const agentByUid = new Map<string, { name: string; email: string }>();

    if (assignedAgentIds.length > 0) {
      const agentRefs = assignedAgentIds.map((uid) => adminDb.collection("users").doc(uid));
      const agentDocs = await adminDb.getAll(...agentRefs);

      for (const agentDoc of agentDocs) {
        if (!agentDoc.exists) {
          continue;
        }

        const data = agentDoc.data() as Record<string, unknown>;
        const name = typeof data.username === "string" && data.username.trim() ? data.username.trim() : "Agent";
        const email = typeof data.email === "string" && data.email.trim() ? data.email.trim() : "--";
        agentByUid.set(agentDoc.id, { name, email });
      }
    }

    const orderIds = orderDocs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      return typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
    });

    const completedOrderIds = new Set<string>();
    if (orderIds.length > 0) {
      const dispatchRefs = orderIds.map((orderId) => adminDb.collection("order-dispatches").doc(orderId));
      const dispatchDocs = await adminDb.getAll(...dispatchRefs);
      for (const dispatchDoc of dispatchDocs) {
        if (!dispatchDoc.exists) {
          continue;
        }

        const data = dispatchDoc.data() as Record<string, unknown>;
        if (typeof data.status === "string" && data.status === "completed") {
          completedOrderIds.add(dispatchDoc.id);
        }
      }
    }

    const rows: OrderRow[] = orderDocs
      .map((docRow) => {
        const data = docRow.data() as Record<string, unknown>;
        const orderId = typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
        const assignedAgentId = typeof data.assignedAgentId === "string" ? data.assignedAgentId.trim() : "";
        const assignedAgent = assignedAgentId ? agentByUid.get(assignedAgentId) : null;
        const totalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
        const currency = normalizeCurrency(data.currency);
        const supplierPercentage =
          typeof data.supplierPercentage === "number" && Number.isFinite(data.supplierPercentage) ? data.supplierPercentage : 75;
        const supplierPayout =
          typeof data.supplierPayout === "number" && Number.isFinite(data.supplierPayout)
            ? data.supplierPayout
            : Math.round(totalCents * (supplierPercentage / 100));
        const grossProfit =
          typeof data.grossProfit === "number" && Number.isFinite(data.grossProfit)
            ? data.grossProfit
            : Math.max(0, totalCents - supplierPayout);
        const netProfit =
          typeof data.netProfit === "number" && Number.isFinite(data.netProfit)
            ? data.netProfit
            : grossProfit;
        const totalUsdCents = convertCentsToUsdCents(totalCents, currency, usdRates);
        const supplierPayoutUsdCents = convertCentsToUsdCents(supplierPayout, currency, usdRates);
        const grossProfitUsdCents = convertCentsToUsdCents(grossProfit, currency, usdRates);
        const netProfitUsdCents = convertCentsToUsdCents(netProfit, currency, usdRates);

        const status =
          (typeof data.orderStatus === "string" && data.orderStatus === "completed") || completedOrderIds.has(orderId)
            ? "Completed"
            : typeof data.paymentStatus === "string" && data.paymentStatus === "paid"
              ? "Paid"
              : "Unpaid";

        return {
          id: orderId,
          created: formatIsoDate(typeof data.stripeCreatedAt === "string" ? data.stripeCreatedAt : null),
          status,
          agentName: assignedAgent?.name ?? (assignedAgentId ? `UID: ${assignedAgentId}` : "--"),
          agentEmail: assignedAgent?.email ?? "--",
          nickname: typeof data.nickname === "string" && data.nickname ? data.nickname : "--",
          email: typeof data.customerEmail === "string" && data.customerEmail ? data.customerEmail : "--",
          gameTitle: typeof data.gameTitle === "string" && data.gameTitle ? data.gameTitle : "--",
          categoryTitle: typeof data.categoryTitle === "string" && data.categoryTitle ? data.categoryTitle : "--",
          goldAmount: typeof data.goldAmount === "number" ? `${data.goldAmount.toLocaleString("en-US")}` : "--",
          server: typeof data.server === "string" && data.server ? data.server : "--",
          faction: typeof data.faction === "string" && data.faction ? data.faction : "--",
          deliveryMethod: typeof data.deliveryMethod === "string" && data.deliveryMethod ? data.deliveryMethod : "--",
          paymentMethod: typeof data.paymentMethod === "string" && data.paymentMethod ? data.paymentMethod : "--",
          total: `$${(totalUsdCents / 100).toFixed(2)}`,
          currency: "usd",
          totalCents: totalUsdCents,
          supplierName: typeof data.supplierName === "string" && data.supplierName ? data.supplierName : "--",
          supplierPercentage,
          supplierPayout: supplierPayoutUsdCents,
          grossProfit: grossProfitUsdCents,
          netProfit: netProfitUsdCents,
        };
      })
      .filter((row) => {
        if (statusFilter === "completed") {
          return row.status === "Completed";
        }

        if (statusFilter === "open") {
          return row.status !== "Completed";
        }

        return true;
      });

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;
    return Response.json({ items: rows, nextCursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load orders.";
    const status = message.includes("admin") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
