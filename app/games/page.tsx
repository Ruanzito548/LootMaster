import Link from "next/link";
import { ArrowRight, Flame, ShieldCheck, Sparkles } from "lucide-react";

import { games, serviceCategories } from "../data/games";

const heroArtByGame: Record<string, string> = {
  "tbc-anniversary": "/wow/wow-tbc/tbc-logo.jpg",
  retail: "/wow/wow-retail/midinight-logo.jpeg",
  "classic-era": "/wow/wow-classic-era/classic-era-logo.jpg",
  "mist-of-pandaria": "/wow/wow-pandaria/pandaria-logo.jpg",
};

export default function GamesIndexPage() {
  return (
    <div className="loot-shell gm-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="gm-glass rounded-[1.8rem] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <span className="gm-badge inline-flex items-center gap-2 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.17em]">
                <Sparkles className="h-3.5 w-3.5" />
                Games launcher
              </span>
              <h1 className="mt-5 font-throne text-5xl font-black leading-[0.96] text-[#eaf4ff] sm:text-6xl">Choose Your Game</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#a4bddc] sm:text-base">
                Enter a focused marketplace per game with dedicated gold, account and boost flows.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-[0.13em]">
                  Back home
                </Link>
                <Link href="/rewards" className="gm-button gm-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-[0.13em]">
                  Rewards track
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="gm-panel rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-[#3ba8ff]/20 p-2 text-[#6ee7ff]"><Flame className="h-4 w-4" /></span>
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#8baed8]">Live orders</p>
                    <p className="text-sm font-black text-[#e5f3ff]">Fast queue updates</p>
                  </div>
                </div>
              </article>

              <article className="gm-panel rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-[#22c55e]/20 p-2 text-[#86efac]"><ShieldCheck className="h-4 w-4" /></span>
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#8baed8]">Protected</p>
                    <p className="text-sm font-black text-[#e5f3ff]">Secure checkout stack</p>
                  </div>
                </div>
              </article>

              <article className="gm-panel rounded-xl px-4 py-3 sm:col-span-2">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#8baed8]">Available services</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {serviceCategories.map((category) => (
                    <span key={category.id} className="rounded-full bg-white/8 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.13em] text-[#aecaea]">
                      {category.title}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.id}`} className="group relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#121d35]">
              <div
                className="h-72 transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundImage: `linear-gradient(180deg,rgba(6,11,24,0.22),rgba(6,11,24,0.88)), url('${heroArtByGame[game.id] ?? heroArtByGame.retail}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(59,168,255,0.2),transparent_35%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="gm-panel rounded-xl px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[0.56rem] font-bold uppercase tracking-[0.15em] text-[#88add9]">{game.tag}</p>
                      <h2 className="mt-1 text-lg font-black text-[#eaf4ff]">{game.shortTitle}</h2>
                    </div>
                    <span className="gm-badge px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em]">Live</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#a7c2e0]">{game.description}</p>
                  <span className="gm-button gm-button-primary mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[0.62rem] uppercase tracking-[0.14em]">
                    Enter hub
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
