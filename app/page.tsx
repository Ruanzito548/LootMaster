import Link from "next/link";

import { HotGames } from "./components/hot-games";
import { Navbar } from "./components/navbar";
import { games } from "./data/games";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_42%,#070b14_100%)] text-white">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-cyan-300/12 bg-cyan-300/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
              Gamer Marketplace
            </span>

            <div className="space-y-4">
              <h1 className="font-throne max-w-3xl text-6xl leading-none sm:text-7xl">
                Buy gaming accounts, services and currency.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-400">
                Loot Master is a gaming marketplace where players can shop for
                game currency, boosting services and accounts across different
                titles.
              </p>
            </div>

            <div id="fluxo" className="flex flex-wrap gap-3">
              {["Accounts", "Services", "Currency"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#games"
                className="rounded-full bg-cyan-400 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Explore games
              </a>
              <Link
                href="/admin"
                className="rounded-full border border-white/10 bg-white/6 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Open admin
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#111827_0%,#0f172a_55%,#082f49_100%)] p-6 text-white shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%)]" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                  Marketplace
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Live
                </span>
              </div>

              <div className="rounded-[1.5rem] bg-white/8 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">What players can buy</p>
                <p className="mt-2 text-3xl font-black">Accounts, services and gold</p>
                <p className="mt-3 text-sm text-slate-300">
                  Pick a game first, then move into the category that fits what
                  you need.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Gold", "Boost", "Accounts"].map((item, index) => (
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
          className="rounded-[2rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)]"
        >
          <div className="pb-8">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
              Games
            </p>
            <h2 className="font-throne mt-3 text-4xl leading-tight sm:text-5xl">
              Choose a game to start browsing.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game, index) => (
              <article
                key={game.title}
                className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-cyan-300/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-bold text-cyan-300">
                      0{index + 1}
                    </span>
                    <h3 className="mt-3 max-w-md text-2xl font-black leading-tight">
                      {game.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                    {game.tag}
                  </span>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-5">
                  <span className="text-sm font-semibold text-slate-400">
                    Select
                  </span>
                  <Link
                    href={`/games/${game.id}`}
                    className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-950"
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
