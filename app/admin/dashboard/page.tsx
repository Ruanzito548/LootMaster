import Link from "next/link";
import Stripe from "stripe";

import { DashboardClient, type DashboardOrder } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const orders: DashboardOrder[] = sessions.map((session) => {
    const amountTotal = typeof session.amount_total === "number" ? session.amount_total : 0;
    const checkoutStatus = session.status;
    const paymentStatus = session.payment_status;

    let statusLabel = "Nao pago";
    if (paymentStatus === "paid") statusLabel = "Pago";
    else if (checkoutStatus === "expired") statusLabel = "Expirado";
    else if (checkoutStatus === "open") statusLabel = "Pendente";

    return {
      id: session.id,
      createdUnix: session.created,
      amountTotal,
      currency: session.currency || "brl",
      statusLabel,
      gameTitle: session.metadata?.gameTitle || "--",
      categoryTitle: session.metadata?.categoryTitle || "--",
      paymentMethod: session.metadata?.paymentMethod || "--",
      nickname: session.metadata?.nickname || "--",
      email: session.customer_email || "--",
    };
  });

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin</p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">Dashboard</h1>
          <p className="max-w-2xl text-base leading-8 text-green-600">
            Visualize os valores de pedidos com filtros por periodo, status, jogo e pagamento.
          </p>
        </div>

        <section className="mt-8">
          <DashboardClient orders={orders} loadError={loadError} />
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
