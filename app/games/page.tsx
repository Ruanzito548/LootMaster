import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { games } from "../data/games";
import { canAccessGame } from "@/lib/game-configuration";
import { getLiveGameConfiguration, isCurrentSessionAdmin } from "@/lib/game-configuration.server";

const heroArtByGame: Record<string, string> = {
  "tbc-anniversary": "/wow/wow-tbc/tbc-logo.avif",
  retail: "/wow/wow-retail/midinight-logo.jpeg",
  "classic-era": "/wow/wow-classic-era/classic-era-logo.jpg",
  "mist-of-pandaria": "/wow/wow-pandaria/pandaria-logo.jpg",
};

export default async function GamesIndexPage() {
  const [config, isAdmin] = await Promise.all([getLiveGameConfiguration(), isCurrentSessionAdmin()]);
  const visibleGames = games.filter((game) => canAccessGame(config, game.id, isAdmin));

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
              <h1 className="mt-5 font-throne text-5xl font-black leading-[0.96] text-[color:var(--text-main)] sm:text-6xl">Choose Your Game</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                Launcher-ready game hubs.
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

          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleGames.map((game) => {
            const isDisabledForPublic = !config.byGame[game.id]?.enabled;

            return (
            <Link key={game.id} href={`/games/${game.id}`} className="group relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#171a20]">
              <div
                className="h-72 transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.32)), url('${heroArtByGame[game.id] ?? heroArtByGame.retail}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%,rgba(0,0,0,0.18)_74%,rgba(0,0,0,0.46)_100%)]" />
              <div className="pointer-events-none absolute inset-0 opacity-65 [background-image:linear-gradient(135deg,rgba(255,255,255,0.03),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />

              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,11,14,0.54),rgba(10,11,14,0.82))] px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-[2px]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[0.56rem] font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">{game.tag}</p>
                      <h2 className="mt-1 text-2xl font-black text-[color:var(--text-main)]">{game.shortTitle}</h2>
                    </div>
                    {isDisabledForPublic ? (
                      <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-amber-100">
                        Disabled (Admin Only)
                      </span>
                    ) : (
                      <span className="gm-badge px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em]">Live</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{game.description}</p>
                  <span className="gm-button gm-button-primary mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[0.62rem] uppercase tracking-[0.14em]">
                    Enter hub
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
