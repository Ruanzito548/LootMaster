import Link from "next/link";

export default function ProfileHistoryPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Histórico
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Últimas vendas e compras
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Acompanhe o histórico de movimentações do seu perfil no marketplace.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-col gap-6">
            {[
              { title: "Compra de 5.000 gold", status: "Concluído", value: "R$ 179,00" },
              { title: "Venda de conta Retail", status: "Pendente", value: "R$ 420,00" },
              { title: "Resgate de baú", status: "Concluído", value: "Ticket usado" },
            ].map((item) => (
              <article key={item.title} className="rounded-3xl border border-[#fff1be]/10 bg-[#06121d]/80 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="loot-title text-2xl font-black">{item.title}</h2>
                    <p className="loot-muted mt-2 text-sm">Status: {item.status}</p>
                  </div>
                  <p className="text-lg font-black text-[#ffcf57]">{item.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para perfil
          </Link>
          <Link
            href="/profile/inventory"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Ver inventário
          </Link>
        </div>
      </main>
    </div>
  );
}
