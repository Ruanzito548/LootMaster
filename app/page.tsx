import Link from "next/link";

import { games } from "./data/games";
import { HotGames } from "./components/hot-games";
import { Navbar } from "./components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7ecd2_0%,#f4eee2_32%,#ebe3d2_62%,#e5dac6_100%)] text-zinc-950">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-amber-950/15 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-900">
              World of Warcraft Gold
            </span>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-tight sm:text-6xl">
                Estrutura da venda com foco na primeira camada: escolha o game.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-700">
                Montei a base da pagina para compra de gold em World of Warcraft
                usando a sequencia que voce pediu: `Game`, `Servidor` e
                `Faccao`. Por enquanto, a interface trabalha somente a etapa de
                jogo.
              </p>
            </div>

            <div id="fluxo" className="flex flex-wrap gap-3">
              {["Game", "Servidor", "Faccao"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-zinc-950 text-white"
                      : "border border-zinc-950/10 bg-white/70 text-zinc-600"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")} {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#games"
                className="rounded-full bg-zinc-950 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Ver jogos
              </a>
              <a
                href="#proximo-passo"
                className="rounded-full border border-zinc-950/15 bg-white/70 px-6 py-3 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
              >
                Ver proxima camada
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(33,24,7,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.30),transparent_38%)]" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
                  Checkout Flow
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Etapa 1 ativa
                </span>
              </div>

              <div className="rounded-[1.5rem] bg-white/8 p-5 ring-1 ring-white/10">
                <p className="text-sm text-zinc-300">Camada atual</p>
                <p className="mt-2 text-3xl font-black">Game Selection</p>
                <p className="mt-3 text-sm text-zinc-300">
                  O usuario primeiro escolhe qual versao de WoW deseja. Depois,
                  encaixamos servidor e faccao no mesmo fluxo.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Game", "Servidor", "Faccao"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-5 text-center text-sm font-semibold ${
                      index === 0
                        ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
                        : "border-white/10 bg-white/6 text-zinc-300"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <HotGames />

        <section
          id="games"
          className="rounded-[2rem] border border-black/10 bg-white/72 p-8 shadow-sm"
        >
          <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-900">
                Layer 01
              </p>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                Escolha o jogo antes de abrir servidor e faccao.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-600">
              Cada card abaixo representa uma entrada inicial do fluxo. A ideia
              aqui e deixar a decisao principal clara e escaneavel.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game, index) => (
              <article
                key={game.title}
                className="group rounded-[1.75rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,236,0.96))] p-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-bold text-amber-800">
                      0{index + 1}
                    </span>
                    <h3 className="mt-3 max-w-md text-2xl font-black leading-tight">
                      {game.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-amber-900/15 bg-amber-100/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-900">
                    {game.tag}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-zinc-600">
                  {game.description}
                </p>

                <div className="mt-8 flex items-center justify-between border-t border-black/8 pt-5">
                  <span className="text-sm font-semibold text-zinc-500">
                    Proximo: selecionar servidor
                  </span>
                  <Link
                    href="/admin"
                    className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
                  >
                    Select
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="proximo-passo"
          className="grid gap-6 py-16 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="space-y-4">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-900">
              Proxima camada
            </p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              A base ja esta pronta para receber os servidores depois.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Cada jogo pode abrir uma lista propria de servidores",
              "Depois encaixamos a camada de faccao no mesmo fluxo",
              "Os cards ja estao prontos para virar links ou botoes reais",
              "A hierarquia visual separa bem etapa atual e proximo passo",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 text-sm font-medium text-zinc-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section
          id="cta"
          className="rounded-[2rem] border border-black/10 bg-zinc-950 px-8 py-10 text-white"
        >
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-300">
            Status
          </p>
          <h2 className="mt-4 text-3xl font-black">Primeira camada estruturada.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-300">
            Quando voce me passar os servidores, eu encaixo a segunda camada no
            mesmo padrao sem precisar refazer a pagina.
          </p>
        </section>
      </main>
    </div>
  );
}
