import Link from "next/link";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import CreateTestOrderButton from "./create-test-order-button";
import OrdersExportButton, { type OrderRow } from "./export-button";
import OrdersTable from "./orders-table";

export const dynamic = "force-dynamic";

function formatMoney(amountInCents: number | null, currency: string | null) {
  if (typeof amountInCents !== "number" || !currency) return "--";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
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

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function buildFinancials(totalCents: number, commissionPercentRaw: number) {
  const commissionPercent = clampPercent(commissionPercentRaw);
  const sellerAmountCents = Math.round(totalCents * (1 - commissionPercent / 100));
  const platformProfitCents = totalCents - sellerAmountCents;

  return {
    commissionPercent,
    sellerAmountCents,
    platformProfitCents,
  };
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

export default async function AdminOrdersPage() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  let sessions: Stripe.Checkout.Session[] = [];
  let rows: OrderRow[] = [];
  let loadError: string | null = null;
  let completedOrderIds = new Set<string>();

  try {
    const adminDb = getAdminDb();
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
      .limit(200)
      .get();

    rows = snapshot.docs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
      const totalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
      const currency = typeof data.currency === "string" && data.currency ? data.currency : "brl";
      const storedCommissionPercent = typeof data.commissionPercent === "number" ? data.commissionPercent : 15;
      const financials =
        typeof data.sellerAmountCents === "number" && typeof data.platformProfitCents === "number"
          ? {
              commissionPercent: clampPercent(storedCommissionPercent),
              sellerAmountCents: data.sellerAmountCents,
              platformProfitCents: data.platformProfitCents,
            }
          : buildFinancials(totalCents, storedCommissionPercent);

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
        currency,
        totalCents,
        commissionPercent: financials.commissionPercent,
        sellerAmountCents: financials.sellerAmountCents,
        platformProfitCents: financials.platformProfitCents,
      };
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
      status: completedOrderIds.has(s.id) ? "Completed" : getStatus(s.payment_status, s.status).label,
      nickname: s.metadata?.nickname || "--",
      email: s.customer_email || "--",
      gameTitle: s.metadata?.gameTitle || "--",
      categoryTitle: s.metadata?.categoryTitle || "--",
      goldAmount: s.metadata?.goldAmount || "--",
      server: s.metadata?.server || "--",
      faction: s.metadata?.faction || "--",
      deliveryMethod: s.metadata?.deliveryMethod || "--",
      paymentMethod: s.metadata?.paymentMethod || "--",
      total: formatMoney(s.amount_total, s.currency),
      currency: s.currency ?? "brl",
      totalCents: s.amount_total ?? 0,
      commissionPercent: 15,
      sellerAmountCents: Math.round((s.amount_total ?? 0) * 0.85),
      platformProfitCents: (s.amount_total ?? 0) - Math.round((s.amount_total ?? 0) * 0.85),
    }));
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Orders</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CreateTestOrderButton />
            <OrdersExportButton orders={rows} />
          </div>
        </div>

        {loadError ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
          </section>
        ) : rows.length === 0 ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm text-green-600">No orders found.</p>
          </section>
        ) : (
          <OrdersTable rows={rows} />
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Back to admin
          </Link>
        </div>
      </main>
    </div>
  );
}
