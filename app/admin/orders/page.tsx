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
  return new Date(unixSeconds * 1000).toLocaleString("pt-BR");
}

function getStatus(
  paymentStatus: Stripe.Checkout.Session["payment_status"],
  checkoutStatus: Stripe.Checkout.Session["status"],
): { label: string; classes: string } {
  if (paymentStatus === "paid")
    return { label: "Pago", classes: "text-[#a8ff94]" };
  if (checkoutStatus === "expired")
    return { label: "Expirado", classes: "text-[#ffabab]" };
  if (checkoutStatus === "open")
    return { label: "Pendente", classes: "text-[#ffe39f]" };
  return { label: "Não pago", classes: "text-[#cdeeff]" };
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
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin</p>
            <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Pedidos</h1>
          </div>
          <OrdersExportButton orders={rows} />
        </div>

        <section className="loot-panel mt-8 overflow-x-auto rounded-[2rem] p-0">
          {loadError ? (
            <p className="px-6 py-4 text-sm font-semibold text-[#ffb0b0]">{loadError}</p>
          ) : sessions.length === 0 ? (
            <p className="px-6 py-4 text-sm font-semibold text-[#9fb4d3]">Nenhum pedido encontrado.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ffffff14] text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a99bf]">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Nickname</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Jogo</th>
                  <th className="px-4 py-3">Gold</th>
                  <th className="px-4 py-3">Servidor</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#ffffff08] transition-colors hover:bg-[#ffffff06] ${i % 2 === 0 ? "" : "bg-[#ffffff03]"}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#8ea3c0]">{row.created}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${getStatus(sessions[i].payment_status, sessions[i].status).classes}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#e2edff]">{row.nickname}</td>
                    <td className="px-4 py-3 text-xs text-[#92a9ca]">{row.email}</td>
                    <td className="px-4 py-3 text-[#d4e5ff]">
                      {row.gameTitle}
                      {row.categoryTitle !== "--" && (
                        <span className="ml-1 text-xs text-[#7a99bf]">/ {row.categoryTitle}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#d4e5ff]">{row.goldAmount}</td>
                    <td className="px-4 py-3 text-xs text-[#92a9ca]">
                      {row.server !== "--" ? row.server : ""}
                      {row.faction !== "--" ? ` / ${row.faction}` : ""}
                      {row.server === "--" && row.faction === "--" ? "--" : ""}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-[#e2edff]">{row.paymentMethod}</td>
                    <td className="px-4 py-3 font-black text-[#ffcf57]">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold">
            Voltar ao admin
          </Link>
        </div>
      </main>
    </div>
  );
}
