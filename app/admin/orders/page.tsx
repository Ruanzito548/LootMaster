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

function compactId(id: string) {
  if (id.length <= 18) {
    return id;
  }

  return `${id.slice(0, 10)}...${id.slice(-6)}`;
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
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => {
                const badge = getOrderBadge(session.payment_status, session.status);
                const gameTitle = session.metadata?.gameTitle || "--";
                const categoryTitle = session.metadata?.categoryTitle || "--";
                const nickname = session.metadata?.nickname || "--";
                const paymentMethod = session.metadata?.paymentMethod || "--";

                return (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-[#ffffff14] bg-[linear-gradient(180deg,rgba(18,33,53,0.88),rgba(8,16,29,0.95))] p-5 shadow-[0_20px_40px_rgba(2,8,18,0.36)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Order</p>
                        <p className="mt-1 text-sm font-semibold text-[#d4e5ff]" title={session.id}>
                          {compactId(session.id)}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="rounded-xl border border-[#ffffff10] bg-[#0d1b30]/70 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#90a7c8]">Player</p>
                        <p className="mt-1 font-semibold text-[#e2edff] break-words">{nickname}</p>
                        <p className="text-xs text-[#92a9ca] break-words">{session.customer_email || "--"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-[#ffffff10] bg-[#0d1b30]/60 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#90a7c8]">Game</p>
                          <p className="mt-1 font-semibold text-[#e2edff]">{gameTitle}</p>
                          <p className="text-xs text-[#92a9ca]">{categoryTitle}</p>
                        </div>
                        <div className="rounded-xl border border-[#ffffff10] bg-[#0d1b30]/60 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#90a7c8]">Payment</p>
                          <p className="mt-1 font-semibold uppercase text-[#e2edff]">{paymentMethod}</p>
                          <p className="text-xs text-[#92a9ca]">{session.metadata?.server || "--"} / {session.metadata?.faction || "--"}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-[#ffffff10] bg-[#0c1728]/75 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#90a7c8]">Total</p>
                        <p className="text-base font-black text-[#ffcf57]">{formatMoney(session.amount_total, session.currency)}</p>
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8ea3c0]">
                        {formatDate(session.created)}
                      </p>
                    </div>
                  </article>
                );
              })}
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
