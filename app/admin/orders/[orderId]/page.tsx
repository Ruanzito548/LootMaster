import Link from "next/link";
import Stripe from "stripe";
import { FieldPath } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

import { AdminOrderApplicantsClient } from "./page-client";

export const dynamic = "force-dynamic";

function formatMoney(amountInCents: number | null, currency: string | null) {
  if (typeof amountInCents !== "number" || !currency) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
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
  };
  let loadError: string | null = null;
  let preloadError: string | null = null;
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
      const currency = typeof data.currency === "string" ? data.currency : "brl";
      const commissionPercent = typeof data.commissionPercent === "number" ? data.commissionPercent : 15;
      const sellerAmountCents =
        typeof data.sellerAmountCents === "number"
          ? data.sellerAmountCents
          : Math.round(amountTotalCents * (1 - commissionPercent / 100));

      summary = {
        orderId,
        gameTitle: typeof data.gameTitle === "string" ? data.gameTitle : "--",
        categoryTitle: typeof data.categoryTitle === "string" ? data.categoryTitle : "--",
        nickname: typeof data.nickname === "string" ? data.nickname : "--",
        goldAmount: typeof data.goldAmount === "number" ? data.goldAmount : 0,
        server: typeof data.server === "string" ? data.server : "-",
        faction: typeof data.faction === "string" ? data.faction : "-",
        totalLabel: formatMoney(
          amountTotalCents,
          currency,
        ),
        payoutLabel: formatMoney(sellerAmountCents, currency),
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
        summary = {
          orderId,
          gameTitle: session.metadata?.gameTitle ?? "--",
          categoryTitle: session.metadata?.categoryTitle ?? "--",
          nickname: session.metadata?.nickname ?? "--",
          goldAmount: Number(session.metadata?.goldAmount ?? 0),
          server: session.metadata?.server ?? "-",
          faction: session.metadata?.faction ?? "-",
          totalLabel: formatMoney(session.amount_total, session.currency),
          payoutLabel: formatMoney(
            Math.round((session.amount_total ?? 0) * 0.85),
            session.currency,
          ),
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
        currency: typeof data.currency === "string" ? data.currency : "brl",
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

        <AdminOrderApplicantsClient summary={summary} initialApplications={initialApplications} />
      </main>
    </div>
  );
}