import Image from "next/image";
import Link from "next/link";

import { HotGames } from "./components/hot-games";
import { games, serviceCategories } from "./data/games";

const marketSignals = [
  { label: "Supported games", value: String(games.length).padStart(2, "0") },
  { label: "Service lanes", value: String(serviceCategories.length).padStart(2, "0") },
  { label: "Fulfillment", value: "24/7" },
];

export default function Home() {
  return (
    <div className="min-h-screen text-white bg-[#030712]">
      
      {/* BACKGROUND GLOBAL */}
      <div className="fixed inset-0 -z-10 
        bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,255,0.08),transparent_40%),
             radial-gradient(circle_at_80%_80%,rgba(0,255,150,0.08),transparent_40%)]" />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-20 pt-10 lg:px-8">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-gradient-to-br from-[#071428] via-[#050d1c] to-[#062a26] p-8 sm:p-12 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">

          <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-400/10 blur-[120px]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">

            {/* LEFT */}
            <div className="space-y-6">

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-xs rounded-full bg-cyan-400/10 border border-cyan-300/20 uppercase tracking-widest">
                  Marketplace OS
                </span>
                <span className="text-xs text-green-300">
                  ● 2,134 orders today
                </span>
              </div>

              <h1 className="text-6xl sm:text-7xl font-black leading-[0.9] bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                Buy gold.<br />
                Skip the grind.
              </h1>

              <p className="text-lg text-[#9abdd6] max-w-xl">
                Fast checkout. Multiple games. One unified system.
              </p>

              <div className="flex gap-4 flex-wrap">
                <Link
                  href="#game-grid"
                  className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-7 py-4 rounded-full transition hover:scale-105 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                >
                  Buy Gold Now
                </Link>

                <Link
                  href="#service-lanes"
                  className="border border-white/20 px-6 py-4 rounded-full hover:bg-white/5 transition"
                >
                  Browse Services
                </Link>
              </div>

              <div className="grid gap-3 pt-4 sm:grid-cols-3">
                {marketSignals.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-xs text-[#7fb6d5] uppercase">{item.label}</p>
                    <p className="text-2xl font-black">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/10 blur-2xl rounded-[2rem]" />

              <div className="relative rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur">

                <p className="text-xs uppercase text-cyan-300">Live System</p>
                <h2 className="text-2xl font-black mt-2">One funnel, many worlds</h2>

                <div className="mt-6 space-y-2">
                  {serviceCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <span>{category.title}</span>
                      <span className="text-xs text-cyan-300">{category.id}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Image
                    src="/lootmasterlogo.png"
                    alt="Loot Master"
                    width={220}
                    height={220}
                    className="drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        <HotGames />

        {/* SERVICE LANES */}
        <section id="service-lanes" className="space-y-6">

          <div>
            <p className="text-xs text-cyan-300 uppercase">Service Lanes</p>
            <h2 className="text-4xl font-black">Choose your intent</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {serviceCategories.map((category) => (
              <div
                key={category.id}
                className="group rounded-[1.5rem] border border-white/10 p-5 transition hover:scale-[1.03] hover:border-cyan-300/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
              >
                <p className="text-xs text-cyan-300">{category.id}</p>
                <h3 className="text-2xl font-black mt-2">{category.title}</h3>
                <p className="text-sm text-[#9abdd6] mt-3">{category.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GAME GRID */}
        <section id="game-grid" className="space-y-6">

          <div className="flex justify-between items-end flex-wrap gap-4">
            <div>
              <p className="text-xs text-cyan-300 uppercase">Game Grid</p>
              <h2 className="text-4xl font-black">Open your route</h2>
            </div>

            <p className="text-sm text-[#9abdd6] max-w-md">
              Direct access to each game funnel with consistent checkout.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="group relative overflow-hidden rounded-[1.8rem] border border-white/10 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-cyan-300/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.25)]"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />

                <div className="relative z-10">
                  <p className="text-xs text-cyan-300">{game.shortTitle}</p>

                  <h3 className="text-3xl font-black mt-2">
                    {game.title}
                  </h3>

                  <p className="text-sm mt-3 text-[#cfe7f5]">
                    {game.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {serviceCategories.map((category) => (
                      <span
                        key={category.id}
                        className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 group-hover:bg-cyan-400/20"
                      >
                        {category.title}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/games/${game.id}`}
                    className="mt-8 inline-block bg-cyan-400 text-black px-5 py-3 rounded-full font-semibold hover:bg-cyan-300"
                  >
                    Enter
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="rounded-[1.8rem] border border-white/10 p-8 bg-gradient-to-r from-[#071428] to-[#062a26]">

          <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-end">

            <div>
              <p className="text-xs text-cyan-300 uppercase">Ready</p>
              <h2 className="text-4xl font-black mt-2">
                Go from homepage to checkout fast
              </h2>
              <p className="text-[#9abdd6] mt-3 max-w-xl">
                Optimized funnel with minimal friction.
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/games"
                className="bg-cyan-400 text-black px-6 py-3 rounded-full font-semibold hover:bg-cyan-300">
                Browse Games
              </Link>

              <Link href="/rewards"
                className="border border-white/20 px-6 py-3 rounded-full hover:bg-white/5">
                Rewards
              </Link>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}