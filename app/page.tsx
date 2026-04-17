import Link from "next/link";
import Image from "next/image";

import { HotGames } from "./components/hot-games";
import { games, serviceCategories } from "./data/games";

export default function Home() {
  return (
    <div className="home-shell min-h-screen overflow-hidden text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <HotGames />

        <section className="relative grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="loot-orb animate-treasure-pulse left-[-6rem] top-8 h-36 w-36 bg-[#f7ba2c]/30" />
          <div className="loot-orb animate-treasure-pulse right-8 top-16 h-24 w-24 bg-[#f7ba2c]/20" />
          <div className="loot-orb bottom-[-2rem] right-[-2rem] h-32 w-32 bg-[#cc8800]/18" />

          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-[#ffd76a]/20 bg-[#f7ba2c]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ffc94d]">
              Treasure Marketplace
            </span>

            <div className="space-y-4">
              <h1 className="font-throne max-w-4xl text-5xl leading-none text-[#ffcf57] drop-shadow-[0_6px_24px_rgba(247,186,44,0.28)] sm:text-6xl">
                Gold, crystals and power-up vibes for every game run.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[#dbcaa7]">
                Loot Master brings the same energy as the logo: enchanted treasure,
                bright rewards and a premium fantasy storefront for accounts,
                boosts and in-game currency.
              </p>
            </div>

            <div id="fluxo" className="flex flex-wrap gap-3">
              {["Accounts", "Services", "Currency"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "border-[#fff1be]/50 bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] text-[#311204]"
                      : "border-[#ffd76a]/15 bg-[#1a0f00]/50 text-[#ffe699]"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="#games"
                className="loot-gold-button rounded-full px-6 py-3 text-center text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              >
                Explore games
              </Link>
              <Link
                href="#how-it-works"
                className="loot-secondary-button rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors hover:brightness-110"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="home-panel relative overflow-hidden rounded-[2rem] p-6">
            <div className="absolute left-6 top-8 h-20 w-20 rounded-full bg-[#f7ba2c]/20 blur-2xl" />
            <div className="absolute bottom-6 right-6 h-28 w-28 rounded-full bg-[#c87800]/18 blur-2xl" />
            <div className="absolute right-[-1rem] top-10 h-28 w-28 rotate-12 rounded-[2rem] border border-[#ffd76a]/20 bg-[linear-gradient(180deg,rgba(247,186,44,0.22),rgba(100,60,0,0.12))] animate-crystal-float" />
            <div className="space-y-5 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-[#ffc94d]/85">
                  Treasure Vault
                </span>
                <span className="rounded-full border border-[#fff1be]/15 bg-[#fff1be]/10 px-3 py-1 text-xs text-[#ffcf57]">
                  Live
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,222,124,0.18),rgba(80,50,0,0.08))] p-5 ring-1 ring-[#fff1be]/10">
                  <p className="text-sm text-[#dbcaa7]">What players can buy</p>
                  <p className="mt-2 text-3xl text-[#ffcf57]">
                    Accounts, boosts and gold
                  </p>
                </div>

                <div className="relative mx-auto flex max-w-[20rem] items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#f7ba2c]/15 blur-3xl" />
                  <Image
                    src="/lootmasterlogo.png"
                    alt="Loot Master treasure logo"
                    width={460}
                    height={460}
                    priority
                    className="relative z-10 h-auto w-full drop-shadow-[0_18px_42px_rgba(247,186,44,0.24)]"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Gold", "Boost", "Accounts"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-5 text-center text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                      index === 0
                        ? "border-[#fff1be]/35 bg-[linear-gradient(180deg,rgba(247,186,44,0.24),rgba(204,122,21,0.18))] text-[#fff1be]"
                        : "border-[#ffd76a]/12 bg-[#120c00]/45 text-[#ffe699]"
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
                    className="rounded-2xl border border-[#fff1be]/10 bg-black/20 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-[#b6a17b]">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#ffcf57]">
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
          <div className="home-panel rounded-[1.8rem] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
              Flow
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#ffcf57]">
              From glowing loot to checkout in a few clicks.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#dbcaa7]">
              The homepage now feels closer to the brand art, while still guiding
              players from discovery into the right game, category and order path.
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
                className="home-panel rounded-[1.6rem] p-5"
              >
                <h3 className="text-xl font-black text-[#ffc94d]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#dbcaa7]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="games" className="py-10">
          <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
                Games
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#ffcf57]">
                Choose where the order starts.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#cdb991]">
              Every card leads into the same route structure already live in the
              marketplace flow.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game) => (
              <article
                key={game.id}
                className="home-panel rounded-[1.75rem] p-6"
                style={
                  game.id === "tbc-anniversary"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(7,11,26,0.78),rgba(7,11,26,0.78)), url('/wowtbc.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "retail"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(7,11,26,0.78),rgba(7,11,26,0.78)), url('/midnightwallpaper.jpeg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-[#ffd76a]/20 bg-[#1a0f00]/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#ffe699]">
                      {game.tag}
                    </span>
                    <h3 className="mt-4 text-3xl font-black leading-tight text-[#ffc94d]">
                      {game.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#fff1be]/12 bg-[#fff1be]/8 px-3 py-1 text-xs font-semibold text-[#e4d0a7]">
                    {game.shortTitle}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-[#dbcaa7]">
                  {game.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {serviceCategories.map((category) => (
                    <span
                      key={`${game.id}-${category.id}`}
                      className="rounded-full border border-[#ffd76a]/15 bg-[#1a0f00]/40 px-3 py-1 text-xs font-semibold text-[#ffe699]"
                    >
                      {category.title}
                    </span>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/games/${game.id}`}
                    className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                  >
                    Open {game.shortTitle}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className="home-panel rounded-[2rem] p-8">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
              Ready
            </p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-4xl font-black leading-tight text-[#ffcf57]">
                  Send players from highlight to checkout path faster.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[#dbcaa7]">
                  Highlights surface hot games, the homepage explains the offer,
                  and the game grid now lands users directly inside the funnel.
                </p>
              </div>
              <Link
                href="#hots"
                className="loot-secondary-button inline-flex rounded-full px-6 py-3 text-sm font-semibold transition-colors hover:brightness-110"
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
