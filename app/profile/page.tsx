import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Perfil
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Sua conta Gold
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            A central do seu perfil agora reúne inventário, histórico e ajustes de capa.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Link
            href="/profile/inventory"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#ffc94d]">
              Inventário
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">
              Saldo, tickets e chaves
            </h2>
            <p className="loot-muted mt-4 text-base leading-7">
              Veja seus recursos principais e gerencie seu saldo diretamente.
            </p>
          </Link>

          <Link
            href="/profile/cover"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#8dd0ff]">
              Capa e perfil
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">
              Personalize sua presença
            </h2>
            <p className="loot-muted mt-4 text-base leading-7">
              Atualize sua imagem de perfil e foto de capa para brilhar no marketplace.
            </p>
          </Link>

          <Link
            href="/profile/history"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#f7ba2c]">
              Histórico
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">
              Vendas e compras
            </h2>
            <p className="loot-muted mt-4 text-base leading-7">
              Acompanhe os últimos movimentos do seu inventário e seus pedidos.
            </p>
          </Link>
        </section>

        <div className="mt-12">
          <Link
            href="/"
            className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para home
          </Link>
        </div>
      </main>
    </div>
  );
}
