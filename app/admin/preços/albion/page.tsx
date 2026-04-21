import Link from "next/link";

export default function AlbionPrecosPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin / Jogos</p>
        <h1 className="loot-title mt-4 text-4xl font-black leading-tight sm:text-5xl">Albion Online</h1>
        <p className="loot-muted mt-4 max-w-2xl text-base leading-8">
          Estrutura criada. Adicione aqui as categorias e configuracoes do jogo Albion.
        </p>

        <div className="mt-8">
          <Link href="/admin/preços" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to games
          </Link>
        </div>
      </main>
    </div>
  );
}
