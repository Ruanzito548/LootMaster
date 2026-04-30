import Link from "next/link";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function formatMoney(amountInCents: number | null, currency: string | null) {
  if (typeof amountInCents !== "number" || !currency) {
    return "--";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("pt-BR");
}

function getOrderBadge(
  paymentStatus: Stripe.Checkout.Session["payment_status"],
  checkoutStatus: Stripe.Checkout.Session["status"],
) {
  if (paymentStatus === "paid") {
    return {
      label: "Paid",
      classes: "border-[#1eff00]/40 bg-[#1eff00]/10 text-[#a8ff94]",
    };
  }

  if (checkoutStatus === "expired") {
    return {
      label: "Expired",
      classes: "border-[#ff5050]/35 bg-[#ff5050]/10 text-[#ffabab]",
    };
  }

  if (checkoutStatus === "open") {
    return {
      label: "Pending",
      classes: "border-[#ffd76a]/35 bg-[#ffd76a]/10 text-[#ffe39f]",
    };
  }

  return {
    label: "Unpaid",
    classes: "border-[#84d5ff]/30 bg-[#84d5ff]/10 text-[#cdeeff]",
  };
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
      const result = await stripe.checkout.sessions.list({
        limit: 40,
      });
      sessions = result.data;
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Could not load Stripe orders.";
    }
  }

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">
            Admin
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Orders
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Review Stripe payments, track delivery status, and keep order flow organized.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="loot-muted text-sm font-semibold">Stripe checkout sessions</p>
            <span className="rounded-full border border-[#ffffff14] bg-[#0a1626]/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#b6c6df]">
              {sessions.length} loaded
            </span>
          </div>

          {loadError ? (
            <p className="mt-4 rounded-xl border border-[#ff6060]/35 bg-[#270e0e]/70 px-4 py-3 text-sm font-semibold text-[#ffb0b0]">
              {loadError}
            </p>
          ) : null}

          {!loadError && sessions.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-[#9fb4d3]">
              No orders found yet.
            </p>
          ) : null}

          {!loadError && sessions.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ffffff14] text-xs uppercase tracking-[0.12em] text-[#9cb3d5]">
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Session</th>
                    <th className="px-3 py-3">Player / Email</th>
                    <th className="px-3 py-3">Game</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const badge = getOrderBadge(session.payment_status, session.status);
                    const gameTitle = session.metadata?.gameTitle || "--";
                    const categoryTitle = session.metadata?.categoryTitle || "--";
                    const nickname = session.metadata?.nickname || "--";
                    const paymentMethod = session.metadata?.paymentMethod || "--";

                    return (
                      <tr key={session.id} className="border-b border-[#ffffff0f] align-top text-[#dce8fa]">
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${badge.classes}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[#c9dcf8]">{session.id}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{nickname}</p>
                          <p className="text-xs text-[#90a7c8]">{session.customer_email || "--"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{gameTitle}</p>
                          <p className="text-xs text-[#90a7c8]">{categoryTitle}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold uppercase">{paymentMethod}</p>
                          <p className="text-xs text-[#90a7c8]">{session.metadata?.server || "--"} / {session.metadata?.faction || "--"}</p>
                        </td>
                        <td className="px-3 py-3 font-semibold text-[#ffcf57]">
                          {formatMoney(session.amount_total, session.currency)}
                        </td>
                        <td className="px-3 py-3 text-xs text-[#9ab0cd]">
                          {formatDate(session.created)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to admin
          </Link>
          <Link
            href="/"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
