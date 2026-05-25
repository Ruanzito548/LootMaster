import Image from "next/image";
import Link from "next/link";

import { HotGames } from "./components/hot-games";
import { games, serviceCategories } from "./data/games";

const marketSignals = [
  { label: "Supported games", value: String(games.length).padStart(2, "0"), accent: "text-[#dff4ff]" },
  { label: "Service lanes", value: String(serviceCategories.length).padStart(2, "0"), accent: "text-[#bee7ff]" },
  { label: "Fulfillment", value: "24/7", accent: "text-[#ffe082]" },
];

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.2rem] border border-[#2fd3ff]/20 bg-[linear-gradient(180deg,rgba(20,29,49,0.95)_0%,rgba(12,19,36,0.94)_62%,rgba(9,15,30,0.96)_100%)] p-5 shadow-[0_28px_85px_rgba(0,0,0,0.44)] sm:p-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(0,229,255,0.12)_0%,rgba(0,229,255,0.92)_40%,rgba(255,201,77,0.85)_72%,rgba(255,201,77,0.1)_100%)]" />
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-8 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.5rem] border border-[#3bd5ff]/24 bg-[linear-gradient(180deg,rgba(24,34,57,0.78)_0%,rgba(15,24,42,0.75)_100%)] p-6">
              <p className="inline-flex w-fit rounded-full border border-[#34d6ff]/34 bg-[#34d6ff]/14 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#d9f8ff]">
                Marketplace OS
              </p>

              <div className="mt-5 space-y-4">
                <h1 className="font-throne text-5xl leading-[0.95] text-[#ecf9ff] sm:text-6xl">
                  Trade smarter.
                  <br />
                  Enter the realm loaded.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#abc2de] sm:text-lg">
                  A complete storefront for gold, boosts and accounts with direct routing to each game flow.
                  Pick your title, choose your category and jump to checkout in a few clicks.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="#game-grid"
                  className="loot-gold-button inline-flex rounded-full px-6 py-3 text-sm font-semibold"
                >
                  Start shopping
                </Link>
                <Link
                  href="#service-lanes"
                  className="loot-secondary-button inline-flex rounded-full px-6 py-3 text-sm font-semibold"
                >
                  Explore service lanes
                </Link>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#30d5ff]/22 bg-[linear-gradient(180deg,rgba(20,33,57,0.84)_0%,rgba(12,20,35,0.78)_100%)] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fd4ec]">Live Control</p>
              <h2 className="mt-3 text-2xl font-black text-[#ecf9ff]">Marketplace command panel</h2>
              <p className="mt-2 text-sm leading-7 text-[#9bb6d3]">
                Open any game card and continue with the same checkout logic across categories.
              </p>

              <div className="mt-5 space-y-2">
                {serviceCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-xl border border-[#3ed6ff]/16 bg-black/24 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-[#e6f8ff]">{category.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#8eb4d2]">{category.id}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center">
                <Image
                  src="/lootmasterlogo.png"
                  alt="Loot Master"
                  width={300}
                  height={300}
                  priority
                  className="h-auto w-48 drop-shadow-[0_20px_44px_rgba(52,173,255,0.35)]"
                />
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            {marketSignals.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-[#35d8ff]/16 bg-[linear-gradient(180deg,rgba(15,26,45,0.75),rgba(11,20,35,0.76))] px-4 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8db4d6]">{item.label}</p>
                <p className={`mt-2 text-3xl font-black ${item.accent}`}>{item.value}</p>
              </article>
            ))}
          </div>
        </section>

        <HotGames />

        <section id="service-lanes" className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7bdfff]">Service Lanes</p>
            <h2 className="text-4xl font-black text-[#def4ff]">Choose your trading intent</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {serviceCategories.map((category) => (
              <article
                key={category.id}
                className="group rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,27,48,0.8),rgba(6,14,26,0.86))] p-5 transition hover:-translate-y-1 hover:border-cyan-200/30"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[#7fb6d5]">{category.id}</p>
                <h3 className="mt-3 text-2xl font-black text-[#def4ff]">{category.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#9abdd6]">{category.description}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/80 group-hover:text-cyan-100">
                  Available in selected games
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="game-grid" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7bdfff]">Game Grid</p>
              <h2 className="text-4xl font-black text-[#def4ff]">Open your game route</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#9abdd6]">
              Every card below points directly to the live game route and keeps the same purchase funnel.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game) => (
              <article
                key={game.id}
                className="relative overflow-hidden rounded-[1.7rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,22,39,0.74),rgba(6,14,26,0.9))] p-6"
                style={
                  game.id === "tbc-anniversary"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(8,20,38,0.5),rgba(8,20,38,0.7)), url('/wow/wow-tbc/tbc-logo.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "retail"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(8,20,38,0.5),rgba(8,20,38,0.7)), url('/wow/wow-retail/midinight-logo.jpeg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "classic-era"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(18,15,11,0.52),rgba(18,15,11,0.72)), url('/wow/wow-classic-era/classic-era-logo.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : game.id === "mist-of-pandaria"
                    ? {
                        backgroundImage:
                          "linear-gradient(rgba(7,30,25,0.48),rgba(7,30,25,0.7)), url('/wow/wow-pandaria/pandaria-logo.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8f5ff]">
                  {game.tag}
                </div>

                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9ed7f0]">{game.shortTitle}</p>
                  <h3 className="mt-2 text-3xl font-black text-[#def4ff]">{game.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#d7e7f3]">{game.description}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {serviceCategories.map((category) => (
                      <span
                        key={`${game.id}-${category.id}`}
                        className="rounded-full border border-white/18 bg-black/30 px-3 py-1 text-xs font-semibold text-[#d5ebf8]"
                      >
                        {category.title}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Link
                      href={`/games/${game.id}`}
                      className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold"
                    >
                      Enter {game.shortTitle}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(100deg,rgba(7,24,42,0.86),rgba(7,34,30,0.84))] p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7bdfff]">Ready To Deploy</p>
              <h2 className="mt-3 text-4xl font-black text-[#def4ff]">Jump from homepage to checkout with less friction</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#9abdd6]">
                This homepage is rebuilt from scratch with stronger hierarchy, clearer actions and direct links into every game route.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/games" className="loot-gold-button inline-flex rounded-full px-6 py-3 text-sm font-semibold">
                Browse games
              </Link>
              <Link href="/rewards" className="loot-secondary-button inline-flex rounded-full px-6 py-3 text-sm font-semibold">
                Open rewards
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
