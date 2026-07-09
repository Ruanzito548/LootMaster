import Link from "next/link";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";
import { buildOrderFinancialSnapshot, clampPercent, computeOrderFinancials } from "@/lib/order-financials";

import { DashboardClient, type DashboardOrder } from "./dashboard-client";

export const dynamic = "force-dynamic";

function parseIsoToUnixSeconds(iso: string | null | undefined): number {
  if (!iso) return Math.floor(Date.now() / 1000);
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return Math.floor(Date.now() / 1000);
  return Math.floor(ms / 1000);
}

export default async function DashboardPage() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  let sessions: Stripe.Checkout.Session[] = [];
  let orders: DashboardOrder[] = [];
  let loadError: string | null = null;
  let supplierDefaultPercent = buildDefaultSiteFeeSettings().supplierDefaultPercent;
  let cardGatewayFeePercent = buildDefaultSiteFeeSettings().cardGatewayFeePercent;
  let cashbackPercent = buildDefaultSiteFeeSettings().cashbackPercent;
  let operationalReservePercent = buildDefaultSiteFeeSettings().operationalReservePercent;
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
      console.warn("[Dashboard] Could not load completed dispatch statuses:", error);
    }

    const snapshot = await adminDb
      .collection("order-checkouts")
      .orderBy("updatedAt", "desc")
      .limit(300)
      .get();

    const siteFeeSnapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    const siteFeeSettings = siteFeeSnapshot.exists
      ? sanitizeSiteFeeSettings(siteFeeSnapshot.data())
      : buildDefaultSiteFeeSettings();

    supplierDefaultPercent = siteFeeSettings.supplierDefaultPercent;
    cardGatewayFeePercent = siteFeeSettings.cardGatewayFeePercent;
    cashbackPercent = siteFeeSettings.cashbackPercent;
    operationalReservePercent = siteFeeSettings.operationalReservePercent;

    orders = snapshot.docs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
      const paymentStatus = typeof data.paymentStatus === "string" ? data.paymentStatus.toLowerCase() : "";
      const orderStatus = typeof data.orderStatus === "string" ? data.orderStatus.toLowerCase() : "";
      const financials = buildOrderFinancialSnapshot(data, {
        supplierDefaultPercent,
        cardGatewayFeePercent,
        cashbackPercent,
        operationalReservePercent,
      });

      let statusLabel = "Unpaid";
      if (orderStatus === "completed" || completedOrderIds.has(orderId)) {
        statusLabel = "Completed";
      } else if (paymentStatus === "paid") {
        statusLabel = "Paid";
      }

      return {
        id: orderId,
        createdUnix: parseIsoToUnixSeconds(typeof data.stripeCreatedAt === "string" ? data.stripeCreatedAt : null),
        amountTotal: financials.grossRevenue,
        currency: typeof data.currency === "string" && data.currency ? data.currency : "brl",
        statusLabel,
        gameTitle: typeof data.gameTitle === "string" && data.gameTitle ? data.gameTitle : "--",
        categoryTitle: typeof data.categoryTitle === "string" && data.categoryTitle ? data.categoryTitle : "--",
        paymentMethod: typeof data.paymentMethod === "string" && data.paymentMethod ? data.paymentMethod : "--",
        paymentGateway: typeof data.paymentGateway === "string" && data.paymentGateway ? data.paymentGateway : "--",
        paymentProvider: typeof data.paymentProvider === "string" && data.paymentProvider ? data.paymentProvider : "--",
        country: typeof data.country === "string" && data.country ? data.country : "--",
        countryCode: typeof data.countryCode === "string" && data.countryCode ? data.countryCode : "--",
        nickname: typeof data.nickname === "string" && data.nickname ? data.nickname : "--",
        email: typeof data.customerEmail === "string" && data.customerEmail ? data.customerEmail : "--",
        supplierName: typeof data.supplierName === "string" && data.supplierName ? data.supplierName : "--",
        supplierPercentage: financials.supplierPercentage,
        supplierPayout: financials.supplierPayout,
        grossProfit: financials.grossProfit,
        cardFee: financials.cardFee,
        cashback: financials.cashback,
        operationalReserve: financials.operationalReserve,
        netProfit: financials.netProfit,
      };
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load Firestore orders for dashboard.";
  }

  if (orders.length === 0) {
    if (!secretKey) {
      loadError = loadError ?? "Stripe secret key not configured.";
    } else {
      try {
        const stripe = new Stripe(secretKey);
        const result = await stripe.checkout.sessions.list({ limit: 100 });
        sessions = result.data;
      } catch (error) {
        loadError = error instanceof Error ? error.message : "Could not load Stripe orders.";
      }
    }
  }

  if (orders.length === 0 && sessions.length > 0) {
    try {
      orders = sessions.map((session) => {
        const amountTotal = typeof session.amount_total === "number" ? session.amount_total : 0;
        const meta = session.metadata ?? {};
        const checkoutStatus = session.status;
        const paymentStatus = session.payment_status;
        const supplierPercent = Number.isFinite(Number(meta.supplierPercentage))
          ? clampPercent(Number(meta.supplierPercentage))
          : supplierDefaultPercent;
        const cardFeePercent = Number.isFinite(Number(meta.cardGatewayFeePercent))
          ? clampPercent(Number(meta.cardGatewayFeePercent))
          : cardGatewayFeePercent;
        const cashbackFeePercent = Number.isFinite(Number(meta.cashbackPercent))
          ? clampPercent(Number(meta.cashbackPercent))
          : cashbackPercent;
        const operationalFeePercent = Number.isFinite(Number(meta.operationalReservePercent))
          ? clampPercent(Number(meta.operationalReservePercent))
          : operationalReservePercent;

        const financials = computeOrderFinancials(
          amountTotal,
          supplierPercent,
          cardFeePercent,
          cashbackFeePercent,
          operationalFeePercent,
        );

        let statusLabel = "Unpaid";
        if (completedOrderIds.has(session.id)) statusLabel = "Completed";
        else if (paymentStatus === "paid") statusLabel = "Paid";
        else if (checkoutStatus === "expired") statusLabel = "Expired";
        else if (checkoutStatus === "open") statusLabel = "Pending";

        return {
          id: session.id,
          createdUnix: session.created,
          amountTotal: financials.grossRevenue,
          currency: session.currency || "brl",
          statusLabel,
          gameTitle: meta.gameTitle || "--",
          categoryTitle: meta.categoryTitle || "--",
          paymentMethod: meta.paymentMethod || "--",
          paymentGateway: meta.paymentGateway || "--",
          paymentProvider: meta.paymentProvider || "--",
          country: meta.country || "--",
          countryCode: meta.countryCode || "--",
          nickname: meta.nickname || "--",
          email: session.customer_email || "--",
          supplierName: meta.supplierName || "--",
          supplierPercentage: financials.supplierPercentage,
          supplierPayout: financials.supplierPayout,
          grossProfit: financials.grossProfit,
          cardFee: financials.cardFee,
          cashback: financials.cashback,
          operationalReserve: financials.operationalReserve,
          netProfit: financials.netProfit,
        };
      });
    } catch {
      // sessions mapping should not fail in practice
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="flex w-full flex-1 flex-col px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin</p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">Dashboard</h1>
          <p className="max-w-2xl text-base leading-8 text-green-600">
            Visualize os valores de pedidos com filtros por periodo, status, jogo e pagamento.
          </p>
        </div>

        <section className="mt-8">
          <DashboardClient
            orders={orders}
            loadError={loadError}
            initialSupplierDefaultPercent={supplierDefaultPercent}
            initialCardGatewayFeePercent={cardGatewayFeePercent}
            initialCashbackPercent={cashbackPercent}
            initialOperationalReservePercent={operationalReservePercent}
          />
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900"
          >
            Ver pedidos
          </Link>
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
          >
            Voltar ao admin
          </Link>
        </div>
      </main>
    </div>
  );
}
