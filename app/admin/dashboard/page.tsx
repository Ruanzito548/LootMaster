import Link from "next/link";
import { ADMIN_DASHBOARD_ORDERS_QUERY_LIMIT } from "@/lib/admin-query-limits";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";
import {
  buildOrderFinancialSnapshot,
  computeOrderSummaryFinancials,
  resolveOrderCouponContext,
} from "@/lib/order-financials";

import { DashboardClient, type DashboardOrder } from "./dashboard-client";

export const dynamic = "force-dynamic";

function parseIsoToUnixSeconds(iso: string | null | undefined): number {
  if (!iso) return Math.floor(Date.now() / 1000);
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return Math.floor(Date.now() / 1000);
  return Math.floor(ms / 1000);
}

export default async function DashboardPage() {
  const defaultSiteFeeSettings = buildDefaultSiteFeeSettings();
  let orders: DashboardOrder[] = [];
  let loadError: string | null = null;
  let supplierDefaultPercent = defaultSiteFeeSettings.supplierDefaultPercent;
  let cardGatewayFeePercent = defaultSiteFeeSettings.cardGatewayFeePercent;
  let cashbackPercent = defaultSiteFeeSettings.cashbackPercent;
  let operationalReservePercent = defaultSiteFeeSettings.operationalReservePercent;
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
      .limit(ADMIN_DASHBOARD_ORDERS_QUERY_LIMIT)
      .get();

    const completedOrderDocs = snapshot.docs.filter((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
      const orderStatus = typeof data.orderStatus === "string" ? data.orderStatus.toLowerCase() : "";
      return orderStatus === "completed" || completedOrderIds.has(orderId);
    });
    const orderIds = completedOrderDocs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      return typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
    });
    const feeTransferByOrderId = new Map<string, Record<string, unknown>>();
    if (orderIds.length > 0) {
      const feeTransferSnapshots = await Promise.all(
        orderIds.map((orderId) => adminDb.collection("fee-transfers").doc(orderId).get()),
      );

      for (const feeSnapshot of feeTransferSnapshots) {
        if (!feeSnapshot.exists) {
          continue;
        }

        feeTransferByOrderId.set(feeSnapshot.id, feeSnapshot.data() as Record<string, unknown>);
      }
    }

    const siteFeeSnapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    const siteFeeSettings = siteFeeSnapshot.exists
      ? sanitizeSiteFeeSettings(siteFeeSnapshot.data())
      : defaultSiteFeeSettings;

    supplierDefaultPercent = siteFeeSettings.supplierDefaultPercent;
    cardGatewayFeePercent = siteFeeSettings.cardGatewayFeePercent;
    cashbackPercent = siteFeeSettings.cashbackPercent;
    operationalReservePercent = siteFeeSettings.operationalReservePercent;

    orders = completedOrderDocs.map((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      const orderId = typeof data.orderId === "string" && data.orderId ? data.orderId : docRow.id;
      const financials = buildOrderFinancialSnapshot(data, {
        supplierDefaultPercent,
        cardGatewayFeePercent,
        cashbackPercent,
        operationalReservePercent,
      });
      const totalPaidCents =
        typeof data.amountTotalCents === "number" && Number.isFinite(data.amountTotalCents)
          ? data.amountTotalCents
          : financials.grossRevenue;
      const paymentMethod = typeof data.paymentMethod === "string" ? data.paymentMethod : "--";
      const feeTransfer = feeTransferByOrderId.get(orderId) ?? {};
      const partnerCommissionPercent =
        typeof feeTransfer.agentFeeSharePercent === "number" && Number.isFinite(feeTransfer.agentFeeSharePercent)
          ? feeTransfer.agentFeeSharePercent
          : typeof data.agentFeeSharePercent === "number" && Number.isFinite(data.agentFeeSharePercent)
            ? data.agentFeeSharePercent
          : 0;
      const couponContext = resolveOrderCouponContext(data, feeTransfer);
      const summary = computeOrderSummaryFinancials({
        totalPaidCents,
        goldValueCents: couponContext.goldValueCents,
        discountCents: couponContext.discountCents,
        couponUsed: couponContext.couponUsed,
        paymentMethod,
        supplierPercentage: financials.supplierPercentage,
        cardFeePercent: financials.cardFeePercent,
        cashbackPercent: financials.cashbackPercent,
        operationalReservePercent: financials.operationalReservePercent,
        agentCommissionPercent: partnerCommissionPercent,
      });

      return {
        id: orderId,
        createdUnix: parseIsoToUnixSeconds(typeof data.stripeCreatedAt === "string" ? data.stripeCreatedAt : null),
        amountTotal: summary.totalPaid,
        goldValue: summary.goldValue,
        couponUsed: summary.couponUsed,
        agentCommission: summary.agentCommission,
        agentCommissionPercent: partnerCommissionPercent,
        currency: typeof data.currency === "string" && data.currency ? data.currency : "brl",
        statusLabel: "Completed",
        gameTitle: typeof data.gameTitle === "string" && data.gameTitle ? data.gameTitle : "--",
        categoryTitle: typeof data.categoryTitle === "string" && data.categoryTitle ? data.categoryTitle : "--",
        paymentMethod,
        paymentGateway: typeof data.paymentGateway === "string" && data.paymentGateway ? data.paymentGateway : "--",
        paymentProvider: typeof data.paymentProvider === "string" && data.paymentProvider ? data.paymentProvider : "--",
        country: typeof data.country === "string" && data.country ? data.country : "--",
        countryCode: typeof data.countryCode === "string" && data.countryCode ? data.countryCode : "--",
        nickname: typeof data.nickname === "string" && data.nickname ? data.nickname : "--",
        email: typeof data.customerEmail === "string" && data.customerEmail ? data.customerEmail : "--",
        supplierName: typeof data.supplierName === "string" && data.supplierName ? data.supplierName : "--",
        supplierPercentage: financials.supplierPercentage,
        supplierPayout: summary.supplierPayout,
        grossProfit: summary.grossProfit,
        gatewayFee: summary.gatewayFee,
        gatewayPercent: financials.cardFeePercent,
        cashback: summary.cashback,
        cashbackPercent: financials.cashbackPercent,
        operationalReserve: summary.operationalReserve,
        operationalReservePercent: financials.operationalReservePercent,
        netProfit: summary.netProfit,
        profitMarginPercent: summary.profitMarginPercent,
      };
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load Firestore orders for dashboard.";
  }

  return (
    <div className="text-green-300">
      <main className="flex w-full flex-1 flex-col">
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">Central</p>
          <h1 className="text-3xl font-black leading-tight text-green-200 sm:text-4xl">Dashboard</h1>
          <p className="max-w-2xl text-base leading-8 text-green-500">
            Visualize o resumo financeiro consolidado das ordens completas.
          </p>
        </div>

        <section className="mt-8">
          <DashboardClient
            orders={orders}
            loadError={loadError}
          />
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex rounded-md border border-green-700/60 bg-green-500/90 px-5 py-3 text-sm font-semibold text-black transition hover:brightness-105"
          >
            Ver pedidos
          </Link>
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950/50"
          >
            Voltar ao admin
          </Link>
        </div>
      </main>
    </div>
  );
}
