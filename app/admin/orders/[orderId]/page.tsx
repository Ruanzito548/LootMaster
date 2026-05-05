import Link from "next/link";
import Stripe from "stripe";

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
  };
  let loadError: string | null = null;

  if (!secretKey) {
    loadError = "Stripe secret key not configured.";
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
      };
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Could not load order details.";
    }
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
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
        ) : (
          <AdminOrderApplicantsClient summary={summary} />
        )}
      </main>
    </div>
  );
}