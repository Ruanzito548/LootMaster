import Link from "next/link";
import Stripe from "stripe";
import OrdersExportButton, { type OrderRow } from "./export-button";

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
  let loadError: string | null = null;

  if (!secretKey) {
    loadError = "Stripe secret key not configured.";
  } else {
    try {
      const stripe = new Stripe(secretKey);
      const result = await stripe.checkout.sessions.list({ limit: 100 });
      sessions = result.data;
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Could not load Stripe orders.";
    }
  }

  const rows: OrderRow[] = sessions.map((s) => ({
    id: s.id,
    created: formatDate(s.created),
    status: getStatus(s.payment_status, s.status).label,
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
  }));

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Orders</h1>
          </div>
          <OrdersExportButton orders={rows} />
        </div>

        <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
          {loadError ? (
            <p className="px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
          ) : sessions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-green-600">No orders found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Nickname</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Game</th>
                  <th className="px-4 py-3">Gold</th>
                  <th className="px-4 py-3">Server</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Applicants</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-green-950 transition-colors hover:bg-green-950/40 ${
                      i % 2 === 0 ? "" : "bg-green-950/20"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-green-600">{row.created}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${getStatus(sessions[i].payment_status, sessions[i].status).classes}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-green-300">{row.nickname}</td>
                    <td className="px-4 py-3 text-xs text-green-500">{row.email}</td>
                    <td className="px-4 py-3 text-green-400">
                      {row.gameTitle}
                      {row.categoryTitle !== "--" && <span className="ml-1 text-xs text-green-600">/ {row.categoryTitle}</span>}
                    </td>
                    <td className="px-4 py-3 text-green-400">{row.goldAmount}</td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      {row.server !== "--" ? row.server : ""}
                      {row.faction !== "--" ? ` / ${row.faction}` : ""}
                      {row.server === "--" && row.faction === "--" ? "--" : ""}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium uppercase text-green-400">{row.paymentMethod}</td>
                    <td className="px-4 py-3 font-semibold text-green-300">{row.total}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-950"
                      >
                        View applicants
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

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
