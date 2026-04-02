import Link from "next/link";

import { HotGames } from "./components/hot-games";
import { Navbar } from "./components/navbar";
import { games } from "./data/games";

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef8f7_0%,#e4f0ef_55%,#d8e5ea_100%)] text-slate-950">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-teal-900/10 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-teal-800">
              World of Warcraft Gold
            </span>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-tight sm:text-6xl">
                Escolha o game.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Layout reduzido para testarmos uma nova paleta e uma home mais
                direta.
              </p>
            </div>

            <div id="fluxo" className="flex flex-wrap gap-3">
              {["Game", "Servidor", "Faccao"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-teal-700 text-white"
                      : "border border-slate-900/10 bg-white/75 text-slate-600"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#games"
                className="rounded-full bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-800"
              >
                Ver jogos
              </a>
              <Link
                href="/admin"
                className="rounded-full border border-slate-900/10 bg-white/80 px-6 py-3 text-center text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
              >
                Abrir admin
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(135deg,#0f172a_0%,#164e63_100%)] p-6 text-white shadow-[0_24px_80px_rgba(8,47,73,0.22)]">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                  Flow
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Etapa 1
                </span>
              </div>

              <div className="rounded-[1.5rem] bg-white/8 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">Atual</p>
                <p className="mt-2 text-3xl font-black">Game</p>
                <p className="mt-3 text-sm text-slate-300">
                  Depois seguimos com servidor e faccao.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Game", "Servidor", "Faccao"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-5 text-center text-sm font-semibold ${
                      index === 0
                        ? "border-cyan-200/50 bg-cyan-200/15 text-cyan-100"
                        : "border-white/10 bg-white/6 text-slate-300"
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
          className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-8 shadow-sm"
        >
          <div className="pb-8">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-teal-700">
              Games
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              Selecione uma categoria.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game, index) => (
              <article
                key={game.title}
                className="rounded-[1.75rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff_0%,#f2fbfa_100%)] p-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-bold text-teal-700">
                      0{index + 1}
                    </span>
                    <h3 className="mt-3 max-w-md text-2xl font-black leading-tight">
                      {game.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-teal-900/10 bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
                    {game.tag}
                  </span>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-900/8 pt-5">
                  <span className="text-sm font-semibold text-slate-500">
                    Selecionar
                  </span>
                  <Link
                    href="/admin"
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
                  >
                    Select
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
