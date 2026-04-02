import Link from "next/link";

import { HotGames } from "./components/hot-games";
import { Navbar } from "./components/navbar";
import { games, serviceCategories } from "./data/games";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_42%,#070b14_100%)] text-white">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <HotGames />

        <section className="grid items-start gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-cyan-300/12 bg-cyan-300/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
              Gamer Marketplace
            </span>

            <div className="space-y-4">
              <h1 className="font-throne max-w-4xl text-5xl leading-none sm:text-6xl">
                Buy gaming accounts, services and currency.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-400">
                Loot Master is a gamer marketplace where players can buy accounts,
                boosting services and in-game currency for different titles in one
                place.
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
              <Link
                href="#games"
                className="rounded-full bg-cyan-400 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Explore games
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#111827_0%,#0f172a_55%,#082f49_100%)] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
            <div className="space-y-5">
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
                <p className="mt-2 text-3xl">Accounts, boosts and gold</p>
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

              <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                {[
                  { label: "Games", value: games.length },
                  { label: "Categories", value: serviceCategories.length },
                  { label: "Highlights", value: "Live" },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="grid gap-5 py-6 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="rounded-[1.8rem] border border-white/8 bg-white/4 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
              Flow
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight">
              From game selection to order in a few clicks.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate-400">
              The homepage now mirrors the purchase funnel already implemented in
              the app, so players can jump straight from discovery into the right
              game and category.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "1. Pick a game",
                description:
                  "Start from the homepage and open the title you want to shop for.",
              },
              {
                title: "2. Choose a category",
                description:
                  "Browse gold, boosts or accounts depending on the service.",
              },
              {
                title: "3. Continue to server",
                description:
                  "Move into the server selection flow and complete the order path.",
              },
            ].map((step) => (
              <article
                key={step.title}
                className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5"
              >
                <h3 className="text-xl font-black">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="games" className="py-10">
          <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
                Games
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight">
                Choose where the order starts.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-400">
              Every card leads into the same route structure already live in the
              marketplace flow.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game) => (
              <article
                key={game.id}
                className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(160deg,rgba(17,24,39,0.9),rgba(8,47,73,0.35))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.25)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                      {game.tag}
                    </span>
                    <h3 className="mt-4 text-3xl font-black leading-tight">
                      {game.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-300">
                    {game.shortTitle}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-400">
                  {game.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {serviceCategories.map((category) => (
                    <span
                      key={`${game.id}-${category.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300"
                    >
                      {category.title}
                    </span>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/games/${game.id}`}
                    className="inline-flex rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
                  >
                    Open {game.shortTitle}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className="rounded-[2rem] border border-cyan-300/12 bg-[linear-gradient(120deg,rgba(34,211,238,0.12),rgba(15,23,42,0.96))] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.28)]">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-200">
              Ready
            </p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-4xl font-black leading-tight">
                  Send players from highlight to checkout path faster.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                  Highlights surface hot games, the homepage explains the offer,
                  and the game grid now lands users directly inside the funnel.
                </p>
              </div>
              <Link
                href="#hots"
                className="inline-flex rounded-full border border-white/10 bg-white/8 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/12"
              >
                Review highlights
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
