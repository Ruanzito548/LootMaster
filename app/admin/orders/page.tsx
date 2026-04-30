import Link from "next/link";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  payment?: string;
  q?: string;
};

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

export default async function AdminOrdersPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
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

  const activeStatus = (searchParams.status || "all").toLowerCase();
  const activePayment = (searchParams.payment || "all").toLowerCase();
  const activeQuery = (searchParams.q || "").trim().toLowerCase();

  const filteredSessions = sessions.filter((session) => {
    const badge = getOrderBadge(session.payment_status, session.status);
    const payment = (session.metadata?.paymentMethod || "").toLowerCase();
    const haystack = [
      session.id,
      session.customer_email || "",
      session.metadata?.nickname || "",
      session.metadata?.gameTitle || "",
      session.metadata?.categoryTitle || "",
    ]
      .join(" ")
      .toLowerCase();

    const statusOk = activeStatus === "all" || badge.label.toLowerCase() === activeStatus;
    const paymentOk = activePayment === "all" || payment === activePayment;
    const searchOk = activeQuery === "" || haystack.includes(activeQuery);

    return statusOk && paymentOk && searchOk;
  });

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
              {filteredSessions.length} shown / {sessions.length} loaded
            </span>
          </div>

          <form className="mt-5 grid gap-3 rounded-2xl border border-[#ffffff14] bg-[#0a1524]/70 p-4 lg:grid-cols-[1fr_auto_auto_auto]">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q || ""}
              placeholder="Search by player, email, game or session id"
              className="loot-input px-4 py-3 text-sm font-semibold"
            />

            <select
              name="status"
              defaultValue={activeStatus}
              className="loot-select px-4 py-3 text-sm font-semibold"
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <select
              name="payment"
              defaultValue={activePayment}
              className="loot-select px-4 py-3 text-sm font-semibold"
            >
              <option value="all">All methods</option>
              <option value="pix">Pix</option>
              <option value="card">Card</option>
              <option value="balance">LM Coins</option>
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="loot-gold-button rounded-full px-4 py-3 text-xs font-bold uppercase tracking-[0.14em]"
              >
                Apply
              </button>
              <Link
                href="/admin/orders"
                className="loot-secondary-button rounded-full px-4 py-3 text-xs font-bold uppercase tracking-[0.14em]"
              >
                Clear
              </Link>
            </div>
          </form>

          {loadError ? (
            <p className="mt-4 rounded-xl border border-[#ff6060]/35 bg-[#270e0e]/70 px-4 py-3 text-sm font-semibold text-[#ffb0b0]">
              {loadError}
            </p>
          ) : null}

          {!loadError && filteredSessions.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-[#9fb4d3]">
              No orders match your filters.
            </p>
          ) : null}

          {!loadError && filteredSessions.length > 0 ? (
            <div className="mt-6 space-y-3">
              {filteredSessions.map((session) => {
                const badge = getOrderBadge(session.payment_status, session.status);
                const gameTitle = session.metadata?.gameTitle || "--";
                const categoryTitle = session.metadata?.categoryTitle || "--";
                const nickname = session.metadata?.nickname || "--";
                const paymentMethod = session.metadata?.paymentMethod || "--";

                return (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-[#ffffff14] bg-[linear-gradient(180deg,rgba(18,33,53,0.88),rgba(8,16,29,0.95))] p-4 shadow-[0_18px_30px_rgba(2,8,18,0.32)]"
                  >
                    <div className="grid items-center gap-3 lg:grid-cols-[140px_1.1fr_1fr_1fr_1fr_130px_170px]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Status</p>
                        <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Session</p>
                        <p className="mt-1 text-sm font-semibold text-[#d4e5ff]" title={session.id}>
                          {compactId(session.id)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Player</p>
                        <p className="mt-1 text-sm font-semibold text-[#e2edff] break-words">{nickname}</p>
                        <p className="text-xs text-[#92a9ca] break-words">{session.customer_email || "--"}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Game</p>
                        <p className="mt-1 text-sm font-semibold text-[#e2edff]">{gameTitle}</p>
                        <p className="text-xs text-[#92a9ca]">{categoryTitle}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Payment</p>
                        <p className="mt-1 text-sm font-semibold uppercase text-[#e2edff]">{paymentMethod}</p>
                        <p className="text-xs text-[#92a9ca]">{session.metadata?.server || "--"} / {session.metadata?.faction || "--"}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Total</p>
                        <p className="mt-1 text-sm font-black text-[#ffcf57]">{formatMoney(session.amount_total, session.currency)}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Created</p>
                        <p className="mt-1 text-xs font-semibold text-[#8ea3c0]">{formatDate(session.created)}</p>
                      </div>
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
