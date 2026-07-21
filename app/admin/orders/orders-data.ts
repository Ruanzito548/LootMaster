import Stripe from "stripe";

import { ADMIN_ORDERS_QUERY_LIMIT } from "@/lib/admin-query-limits";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildOrderFinancialSnapshot } from "@/lib/order-financials";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";

import type { OrderRow } from "./export-button";

type SupportedCurrency = "USD" | "BRL" | "EUR";

function normalizeCurrency(value: unknown): SupportedCurrency {
  if (typeof value !== "string") return "USD";

  const normalized = value.trim().toUpperCase();
  if (normalized === "BRL" || normalized === "EUR") {
    return normalized;
  }

  return "USD";
}

function getCurrencyLocale(currency: SupportedCurrency) {
  if (currency === "BRL") return "pt-BR";
  if (currency === "EUR") return "de-DE";
  return "en-US";
}

function formatMoney(amountInCents: number | null, currency: SupportedCurrency) {
  if (typeof amountInCents !== "number") return "--";
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}

function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("en-US");
}

function formatIsoDate(iso: string | null | undefined) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US");
}

function getStatus(
  paymentStatus: Stripe.Checkout.Session["payment_status"],
  checkoutStatus: Stripe.Checkout.Session["status"],
): { label: string; classes: string } {
  if (paymentStatus === "paid")
    return { label: "Paid", classes: "text-green-400" };
  if (checkoutStatus === "expired")
    return { label: "Expired", classes: "text-red-400" };
  if (checkoutStatus === "open")
    return { label: "Pending", classes: "text-yellow-400" };
  return { label: "Unpaid", classes: "text-green-600" };
}

export async function loadOrdersRows(): Promise<{ rows: OrderRow[]; loadError: string | null }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const defaultSiteFeeSettings = buildDefaultSiteFeeSettings();
  let sessions: Stripe.Checkout.Session[] = [];
  let rows: OrderRow[] = [];
  let loadError: string | null = null;
  let completedOrderIds = new Set<string>();
  let siteFeeSettings = defaultSiteFeeSettings;

  try {
    const adminDb = getAdminDb();
    const agentByUid = new Map<string, { name: string; email: string }>();
    try {
      const completedDispatches = await adminDb
        .collection("order-dispatches")
        .where("status", "==", "completed")
        .get();

      completedOrderIds = new Set(completedDispatches.docs.map((docRow) => docRow.id));
    } catch (error) {
      console.warn("[Admin Orders] Could not load completed dispatch statuses:", error);
    }

    const snapshot = await adminDb
      .collection("order-checkouts")
      .orderBy("updatedAt", "desc")
      .limit(ADMIN_ORDERS_QUERY_LIMIT)
      .get();

    const siteFeeSnapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    siteFeeSettings = siteFeeSnapshot.exists
      ? sanitizeSiteFeeSettings(siteFeeSnapshot.data())
      : defaultSiteFeeSettings;

    const assignedAgentIds = Array.from(
      new Set(
        snapshot.docs
          .map((docRow) => {
            const data = docRow.data() as Record<string, unknown>;
            return typeof data.assignedAgentId === "string" ? data.assignedAgentId.trim() : "";
          })
          .filter((value) => value.length > 0),
      ),
    );

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

    rows = snapshot.docs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
      const assignedAgentId = typeof data.assignedAgentId === "string" ? data.assignedAgentId.trim() : "";
      const assignedAgent = assignedAgentId ? agentByUid.get(assignedAgentId) : null;
      const totalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
      const currency = normalizeCurrency(data.currency);
      const financials = buildOrderFinancialSnapshot(data, siteFeeSettings);

      return {
        id: orderId,
        created: formatIsoDate(typeof data.stripeCreatedAt === "string" ? data.stripeCreatedAt : null),
        status:
          (typeof data.orderStatus === "string" && data.orderStatus === "completed") ||
          completedOrderIds.has(orderId)
            ? "Completed"
            : typeof data.paymentStatus === "string" && data.paymentStatus === "paid"
            ? "Paid"
            : "Unpaid",
        agentName: assignedAgent?.name ?? (assignedAgentId ? `UID: ${assignedAgentId}` : "--"),
        agentEmail: assignedAgent?.email ?? "--",
        nickname: typeof data.nickname === "string" && data.nickname ? data.nickname : "--",
        email: typeof data.customerEmail === "string" && data.customerEmail ? data.customerEmail : "--",
        gameTitle: typeof data.gameTitle === "string" && data.gameTitle ? data.gameTitle : "--",
        categoryTitle: typeof data.categoryTitle === "string" && data.categoryTitle ? data.categoryTitle : "--",
        goldAmount:
          typeof data.goldAmount === "number"
            ? `${data.goldAmount.toLocaleString("en-US")}`
            : "--",
        server: typeof data.server === "string" && data.server ? data.server : "--",
        faction: typeof data.faction === "string" && data.faction ? data.faction : "--",
        deliveryMethod: typeof data.deliveryMethod === "string" && data.deliveryMethod ? data.deliveryMethod : "--",
        paymentMethod: typeof data.paymentMethod === "string" && data.paymentMethod ? data.paymentMethod : "--",
        total: formatMoney(totalCents, currency),
        currency: currency.toLowerCase(),
        totalCents,
        supplierName: typeof data.supplierName === "string" && data.supplierName ? data.supplierName : "--",
        supplierPercentage: financials.supplierPercentage,
        supplierPayout: financials.supplierPayout,
        grossProfit: financials.grossProfit,
        netProfit: financials.netProfit,
      } satisfies OrderRow;
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load Firestore orders.";
  }

  if (rows.length === 0 && !loadError) {
    if (!secretKey) {
      loadError = "Stripe secret key not configured and no Firestore order-checkouts found.";
    } else {
      try {
        const stripe = new Stripe(secretKey);
        const result = await stripe.checkout.sessions.list({ limit: 100 });
        sessions = result.data;
      } catch (error) {
        loadError = error instanceof Error ? error.message : "Could not load Stripe orders.";
      }
    }
  } else if (rows.length === 0 && loadError && secretKey) {
    try {
      const stripe = new Stripe(secretKey);
      const result = await stripe.checkout.sessions.list({ limit: 100 });
      sessions = result.data;
      loadError = `${loadError} Showing Stripe fallback data.`;
    } catch (error) {
      const stripeMessage = error instanceof Error ? error.message : "Could not load Stripe orders.";
      loadError = `${loadError} Also failed Stripe fallback: ${stripeMessage}`;
    }
  }

  if (rows.length === 0 && sessions.length > 0) {
    rows = sessions.map((s) => ({
      id: s.id,
      created: formatDate(s.created),
      status: getStatus(s.payment_status, s.status).label,
      agentName: "--",
      agentEmail: "--",
      nickname: s.metadata?.nickname || "--",
      email: s.customer_email || "--",
      gameTitle: s.metadata?.gameTitle || "--",
      categoryTitle: s.metadata?.categoryTitle || "--",
      goldAmount: s.metadata?.goldAmount || "--",
      server: s.metadata?.server || "--",
      faction: s.metadata?.faction || "--",
      deliveryMethod: s.metadata?.deliveryMethod || "--",
      paymentMethod: s.metadata?.paymentMethod || "--",
      total: formatMoney(s.amount_total, normalizeCurrency(s.currency)),
      currency: normalizeCurrency(s.currency).toLowerCase(),
      totalCents: s.amount_total ?? 0,
      supplierName: "--",
      supplierPercentage: siteFeeSettings.supplierDefaultPercent,
      supplierPayout: Math.round((s.amount_total ?? 0) * (siteFeeSettings.supplierDefaultPercent / 100)),
      grossProfit: (s.amount_total ?? 0) - Math.round((s.amount_total ?? 0) * (siteFeeSettings.supplierDefaultPercent / 100)),
      netProfit: (s.amount_total ?? 0) - Math.round((s.amount_total ?? 0) * (siteFeeSettings.supplierDefaultPercent / 100)),
    }));
  }

  return { rows, loadError };
}
