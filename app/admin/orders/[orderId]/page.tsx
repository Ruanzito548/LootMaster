import Link from "next/link";
import Stripe from "stripe";
import { FieldPath } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { convertCentsToUsdCents, getUsdRates, normalizeCurrency } from "@/lib/currency-conversion";
import { computeFeeBreakdownFromNetRevenue } from "@/lib/agency";
import { buildOrderFinancialSnapshot } from "@/lib/order-financials";
import { buildDefaultSiteFeeSettings } from "@/lib/site-fee-settings";
import { isDiscordAutoSendEnabled } from "@/lib/discord-settings";

import { AdminOrderApplicantsClient } from "./page-client";

export const dynamic = "force-dynamic";

function formatMoney(amountInCents: number | null) {
  if (typeof amountInCents !== "number") return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
}

function toIsoRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function resolveGatewayLabel(paymentMethod: string) {
  const normalized = paymentMethod.trim().toLowerCase();

  if (!normalized || normalized === "--") return "Gateway";
  if (normalized.includes("mercado")) return "Gateway Mercado Pago";
  if (normalized.includes("stripe") || normalized.includes("card") || normalized.includes("cartao")) return "Gateway Stripe";
  if (normalized.includes("pix")) return "Gateway";
  return `Gateway ${paymentMethod}`;
}

export default async function AdminOrderApplicantsPage(
  props: PageProps<"/admin/orders/[orderId]">
) {
  const { orderId } = await props.params;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  let summary = {
    orderId,
    gameTitle: "--",
    categoryTitle: "--",
    nickname: "--",
    goldAmount: 0,
    server: "-",
    faction: "-",
    totalLabel: "--",
    payoutLabel: "--",
    totalCents: 0,
    goldCents: 0,
    supplierPayoutCents: 0,
    supplierPercentage: 0,
    gatewayLabel: "Gateway",
    gatewayCents: 0,
    gatewayPercent: 0,
    cashbackCents: 0,
    cashbackPercent: 0,
    operationalReserveCents: 0,
    operationalReservePercent: 0,
    partnerCommissionCents: 0,
    partnerCommissionPercent: 0,
    netProfitCents: 0,
    profitMarginPercent: 0,
    orderCreatedAtIso: null as string | null,
    dailyOrdersCount: 1,
    weeklyOrdersCount: 1,
    monthlyOrdersCount: 1,
    annualOrdersCount: 1,
    agentName: "--",
    agentEmail: "--",
  };
  let loadError: string | null = null;
  let preloadError: string | null = null;
  const discordAutoSendEnabled = await isDiscordAutoSendEnabled();
  let initialApplications: {
    applicationId: string;
    orderId: string;
    uid: string;
    supplierName: string;
    supplierEmail: string;
    supplierDiscordHandle: string;
    supplierDiscordUserId: string;
    gameTitle: string;
    categoryTitle: string;
    goldAmount: number;
    server: string;
    faction: string;
    nickname: string;
    finalAmountCents: number;
    currency: string;
    status: string;
  }[] = [];

  try {
    const adminDb = getAdminDb();
    const orderDoc = await adminDb.collection("order-checkouts").doc(orderId).get();

    if (orderDoc.exists) {
      const data = orderDoc.data() as Record<string, unknown>;
      const amountTotalCents = typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0;
      const sourceCurrency = normalizeCurrency(data.currency);
      const usdRates = await getUsdRates();
      const defaults = buildDefaultSiteFeeSettings();
      const financials = buildOrderFinancialSnapshot(data, {
        supplierDefaultPercent: defaults.supplierDefaultPercent,
        cardGatewayFeePercent: defaults.cardGatewayFeePercent,
        cashbackPercent: defaults.cashbackPercent,
        operationalReservePercent: defaults.operationalReservePercent,
      });
      const totalUsdCents = convertCentsToUsdCents(amountTotalCents, sourceCurrency, usdRates);
      const paymentMethod = typeof data.paymentMethod === "string" ? data.paymentMethod.toLowerCase() : "";
      const paymentSurchargeCents =
        typeof data.paymentSurchargeCents === "number" && Number.isFinite(data.paymentSurchargeCents)
          ? Math.max(0, Math.round(data.paymentSurchargeCents))
          : 0;
      const cardFeePercent = financials.cardFeePercent;
      const goldSourceCents =
        paymentSurchargeCents > 0
          ? Math.max(0, amountTotalCents - paymentSurchargeCents)
          : paymentMethod === "card"
            ? Math.max(0, Math.round(amountTotalCents / (1 + cardFeePercent / 100)))
            : amountTotalCents;
      const goldUsdCents = convertCentsToUsdCents(goldSourceCents, sourceCurrency, usdRates);
      const supplierPayoutUsdCents = Math.max(0, Math.round(goldUsdCents * (financials.supplierPercentage / 100)));
      const gatewaySourceCents = Math.max(0, amountTotalCents - goldSourceCents);
      const gatewayUsdCents = convertCentsToUsdCents(gatewaySourceCents, sourceCurrency, usdRates);
      const cashbackUsdCents = Math.max(0, Math.round(goldUsdCents * (financials.cashbackPercent / 100)));
      const operationalReserveUsdCents = Math.max(0, Math.round(goldUsdCents * (financials.operationalReservePercent / 100)));
      const feeTransferDoc = await adminDb.collection("fee-transfers").doc(orderId).get();
      const feeTransferData = feeTransferDoc.exists ? (feeTransferDoc.data() as Record<string, unknown>) : {};
      const grossProfitUsdCents = Math.max(0, goldUsdCents - supplierPayoutUsdCents);
      const partnerCommissionPercent =
        typeof feeTransferData.agentFeeSharePercent === "number" && Number.isFinite(feeTransferData.agentFeeSharePercent)
          ? feeTransferData.agentFeeSharePercent
          : 0;
      const partnerCommissionUsdCents = computeFeeBreakdownFromNetRevenue(
        goldUsdCents,
        supplierPayoutUsdCents,
        partnerCommissionPercent,
      ).agentPayoutCents;
      const netProfitUsdCents = Math.max(
        0,
        grossProfitUsdCents - cashbackUsdCents - operationalReserveUsdCents - partnerCommissionUsdCents,
      );
      const assignedAgentId = typeof data.assignedAgentId === "string" ? data.assignedAgentId.trim() : "";
      const orderCreatedAtIso =
        typeof data.stripeCreatedAt === "string" && data.stripeCreatedAt
          ? data.stripeCreatedAt
          : null;
      let dailyOrdersCount = 1;
      let weeklyOrdersCount = 1;
      let monthlyOrdersCount = 1;
      let annualOrdersCount = 1;

      if (orderCreatedAtIso) {
        try {
          const orderDate = new Date(orderCreatedAtIso);

          if (!Number.isNaN(orderDate.getTime())) {
            const dayRange = toIsoRange(orderDate);

            const weekStart = new Date(orderDate);
            const weekDay = weekStart.getDay();
            const mondayOffset = (weekDay + 6) % 7;
            weekStart.setDate(weekStart.getDate() - mondayOffset);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const monthStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), 1, 0, 0, 0, 0);
            const monthEnd = new Date(orderDate.getFullYear(), orderDate.getMonth() + 1, 0, 23, 59, 59, 999);

            const yearStart = new Date(orderDate.getFullYear(), 0, 1, 0, 0, 0, 0);
            const yearEnd = new Date(orderDate.getFullYear(), 11, 31, 23, 59, 59, 999);

            const [daySnapshot, weekSnapshot, monthSnapshot, yearSnapshot] = await Promise.all([
              adminDb
                .collection("order-checkouts")
                .where("stripeCreatedAt", ">=", dayRange.startIso)
                .where("stripeCreatedAt", "<=", dayRange.endIso)
                .get(),
              adminDb
                .collection("order-checkouts")
                .where("stripeCreatedAt", ">=", weekStart.toISOString())
                .where("stripeCreatedAt", "<=", weekEnd.toISOString())
                .get(),
              adminDb
                .collection("order-checkouts")
                .where("stripeCreatedAt", ">=", monthStart.toISOString())
                .where("stripeCreatedAt", "<=", monthEnd.toISOString())
                .get(),
              adminDb
                .collection("order-checkouts")
                .where("stripeCreatedAt", ">=", yearStart.toISOString())
                .where("stripeCreatedAt", "<=", yearEnd.toISOString())
                .get(),
            ]);

            dailyOrdersCount = Math.max(1, daySnapshot.size);
            weeklyOrdersCount = Math.max(1, weekSnapshot.size);
            monthlyOrdersCount = Math.max(1, monthSnapshot.size);
            annualOrdersCount = Math.max(1, yearSnapshot.size);
          }
        } catch (rangeError) {
          console.warn("[Admin Order Applicants] Could not resolve period order counts:", rangeError);
        }
      }

      let agentName = "--";
      let agentEmail = "--";

      if (assignedAgentId) {
        const agentDoc = await adminDb.collection("users").doc(assignedAgentId).get();
        if (agentDoc.exists) {
          const agentData = agentDoc.data() as Record<string, unknown>;
          agentName =
            typeof agentData.username === "string" && agentData.username.trim()
              ? agentData.username.trim()
              : `UID: ${assignedAgentId}`;
          agentEmail =
            typeof agentData.email === "string" && agentData.email.trim()
              ? agentData.email.trim()
              : "--";
        } else {
          agentName = `UID: ${assignedAgentId}`;
        }
      }

      summary = {
        orderId,
        gameTitle: typeof data.gameTitle === "string" ? data.gameTitle : "--",
        categoryTitle: typeof data.categoryTitle === "string" ? data.categoryTitle : "--",
        nickname: typeof data.nickname === "string" ? data.nickname : "--",
        goldAmount: typeof data.goldAmount === "number" ? data.goldAmount : 0,
        server: typeof data.server === "string" ? data.server : "-",
        faction: typeof data.faction === "string" ? data.faction : "-",
        totalLabel: formatMoney(totalUsdCents),
        payoutLabel: formatMoney(supplierPayoutUsdCents),
        totalCents: totalUsdCents,
        goldCents: goldUsdCents,
        supplierPayoutCents: supplierPayoutUsdCents,
        supplierPercentage: financials.supplierPercentage,
        gatewayLabel: resolveGatewayLabel(paymentMethod),
        gatewayCents: gatewayUsdCents,
        gatewayPercent: cardFeePercent,
        cashbackCents: cashbackUsdCents,
        cashbackPercent: typeof data.cashbackPercent === "number" ? data.cashbackPercent : 0,
        operationalReserveCents: operationalReserveUsdCents,
        operationalReservePercent: typeof data.operationalReservePercent === "number" ? data.operationalReservePercent : 0,
        partnerCommissionCents: partnerCommissionUsdCents,
        partnerCommissionPercent,
        netProfitCents: netProfitUsdCents,
        profitMarginPercent: goldUsdCents > 0 ? (netProfitUsdCents / goldUsdCents) * 100 : 0,
        orderCreatedAtIso,
        dailyOrdersCount,
        weeklyOrdersCount,
        monthlyOrdersCount,
        annualOrdersCount,
        agentName,
        agentEmail,
      };
    }
  } catch (error) {
    console.warn("[Admin Order Applicants] Could not load summary from Firestore order-checkouts:", error);
  }

  if (summary.gameTitle === "--") {
    if (!secretKey) {
      loadError = "Stripe secret key not configured and order was not found in Firestore order-checkouts.";
    } else {
      try {
        const stripe = new Stripe(secretKey);
        const session = await stripe.checkout.sessions.retrieve(orderId);
        const sourceCurrency = normalizeCurrency(session.currency);
        const usdRates = await getUsdRates();
        const totalUsdCents = convertCentsToUsdCents(session.amount_total ?? 0, sourceCurrency, usdRates);
        const supplierPayoutUsdCents = Math.round(totalUsdCents * 0.75);
        summary = {
          orderId,
          gameTitle: session.metadata?.gameTitle ?? "--",
          categoryTitle: session.metadata?.categoryTitle ?? "--",
          nickname: session.metadata?.nickname ?? "--",
          goldAmount: Number(session.metadata?.goldAmount ?? 0),
          server: session.metadata?.server ?? "-",
          faction: session.metadata?.faction ?? "-",
          totalLabel: formatMoney(totalUsdCents),
          payoutLabel: formatMoney(supplierPayoutUsdCents),
          totalCents: totalUsdCents,
          goldCents: totalUsdCents,
          supplierPayoutCents: supplierPayoutUsdCents,
          supplierPercentage: Number(session.metadata?.supplierPercentage ?? 75) || 75,
          gatewayLabel: resolveGatewayLabel(session.metadata?.paymentMethod ?? ""),
          gatewayCents: 0,
          gatewayPercent: 0,
          cashbackCents: 0,
          cashbackPercent: 0,
          operationalReserveCents: 0,
          operationalReservePercent: 0,
          partnerCommissionCents: 0,
          partnerCommissionPercent: 0,
          netProfitCents: totalUsdCents - supplierPayoutUsdCents,
          profitMarginPercent: totalUsdCents > 0 ? ((totalUsdCents - supplierPayoutUsdCents) / totalUsdCents) * 100 : 0,
          orderCreatedAtIso: typeof session.created === "number" ? new Date(session.created * 1000).toISOString() : null,
          dailyOrdersCount: 1,
          weeklyOrdersCount: 1,
          monthlyOrdersCount: 1,
          annualOrdersCount: 1,
          agentName: "--",
          agentEmail: "--",
        };
      } catch (error) {
        loadError = error instanceof Error ? error.message : "Could not load order details.";
      }
    }
  }

  try {
    const adminDb = getAdminDb();
    const exactSnapshot = await adminDb
      .collection("order-applications")
      .where("orderId", "==", orderId)
      .get();

    const snapshot = exactSnapshot.empty
      ? await adminDb
          .collection("order-applications")
          .where(FieldPath.documentId(), ">=", `${orderId}_`)
          .where(FieldPath.documentId(), "<=", `${orderId}_\uf8ff`)
          .get()
      : exactSnapshot;

    initialApplications = snapshot.docs.map((row) => {
      const data = row.data() as Record<string, unknown>;
      return {
        applicationId: typeof data.applicationId === "string" ? data.applicationId : row.id,
        orderId: typeof data.orderId === "string" ? data.orderId : orderId,
        uid: typeof data.uid === "string" ? data.uid : "",
        supplierName: typeof data.supplierName === "string" ? data.supplierName : "Supplier",
        supplierEmail: typeof data.supplierEmail === "string" ? data.supplierEmail : "",
        supplierDiscordHandle: typeof data.supplierDiscordHandle === "string" ? data.supplierDiscordHandle : "",
        supplierDiscordUserId: typeof data.supplierDiscordUserId === "string" ? data.supplierDiscordUserId : "",
        gameTitle: typeof data.gameTitle === "string" ? data.gameTitle : "",
        categoryTitle: typeof data.categoryTitle === "string" ? data.categoryTitle : "",
        goldAmount: typeof data.goldAmount === "number" ? data.goldAmount : 0,
        server: typeof data.server === "string" ? data.server : "-",
        faction: typeof data.faction === "string" ? data.faction : "-",
        nickname: typeof data.nickname === "string" ? data.nickname : "-",
        finalAmountCents: typeof data.finalAmountCents === "number" ? data.finalAmountCents : 0,
        currency: typeof data.currency === "string" ? data.currency : "usd",
        status: typeof data.status === "string" ? data.status : "applied",
      };
    });
  } catch (error) {
    console.warn("[Admin Order Applicants] Could not pre-load applications from Admin SDK:", error);
    preloadError = error instanceof Error ? error.message : "Unknown preload error.";
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Order Applicants</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/orders" className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950">
              Back to orders
            </Link>
            <Link href="/admin" className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950">
              Back to admin
            </Link>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
            {loadError} Showing applicants using the order ID from the URL.
          </p>
        ) : null}

        {preloadError ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
            Could not load applicants from Firestore Admin SDK: {preloadError}
          </p>
        ) : null}

        <AdminOrderApplicantsClient
          summary={summary}
          initialApplications={initialApplications}
          discordAutoSendEnabled={discordAutoSendEnabled}
        />
      </main>
    </div>
  );
}