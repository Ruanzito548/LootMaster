import Link from "next/link";

export default function WowAccountsPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin / Precos / WOW</p>
        <h1 className="loot-title mt-4 text-4xl font-black leading-tight sm:text-5xl">Accounts</h1>
        <p className="loot-muted mt-4 max-w-2xl text-base leading-8">
          Pagina pronta para configuracoes de preco de contas.
        </p>

        <div className="mt-8">
          <Link href="/admin/preços/wow" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to WOW sections
          </Link>
        </div>
      </main>
    </div>
  );
}
