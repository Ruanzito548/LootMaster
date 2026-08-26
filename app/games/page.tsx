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
        <section className="relative overflow-hidden rounded-[1.8rem] border border-[#d4af6a]/70 bg-[#070d16] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(9,13,22,0.12),rgba(4,7,12,0.38)_58%,rgba(3,4,8,0.58)_100%)]" />
          <div className="absolute inset-x-3 top-2 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,106,0.8),transparent)]" />
          <div className="absolute inset-x-3 bottom-2 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,106,0.8),transparent)]" />

          <img
            src="/home/logoescrita.png"
            alt="Loot Master"
            className="pointer-events-none absolute right-8 top-1/2 hidden h-84 w-84 -translate-y-1/2 object-contain md:block"
          />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col items-center text-center lg:items-center lg:text-center">
              <h1 className="mt-5 font-throne text-5xl font-black leading-[0.96] text-[color:var(--text-main)] sm:text-6xl">Choose Your Game</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                Launcher-ready game hubs.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
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
              <Link key={game.id} href={`/games/${game.id}`} className="group block" aria-label={`Open ${game.shortTitle}`}>
                <article className="group relative h-[28.5rem] overflow-hidden rounded-[1.5rem] border border-[#d4af6a]/80 bg-[#0a0f18] shadow-[0_20px_45px_rgba(0,0,0,0.48)] transition-all duration-300 hover:-translate-y-1 hover:border-[#f5d17a] hover:shadow-[0_24px_52px_rgba(212,175,106,0.18)]">
                  <div
                    className="absolute inset-0 scale-100 transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage: `url('${heroArtByGame[game.id] ?? heroArtByGame.retail}')`,
                      backgroundSize: "cover",
                      backgroundPosition:
                        game.id === "classic-era"
                          ? "left 775px center"
                          : game.id === "mist-of-pandaria"
                            ? "left 400px center"
                            : game.id === "tbc-anniversary"
                              ? "left 570px center"
                              : "center",
                    }}
                  />

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.18)_38%,rgba(0,0,0,0.24)_100%)] transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-0 opacity-70 [background:linear-gradient(135deg,rgba(255,255,255,0.05),transparent_22%,transparent_80%,rgba(255,255,255,0.01))]" />
                  <div className="absolute inset-x-0 bottom-0 h-[54%] bg-[linear-gradient(180deg,rgba(4,5,9,0.04),rgba(4,5,9,0.52)_25%,rgba(2,3,6,0.82)_100%)]" />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="px-2 pb-2 pt-2">
                      <div className="mb-3 flex items-center justify-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#d4af6a]/75 bg-[#0d1219]/80 shadow-[0_0_18px_rgba(212,175,106,0.25)]">
                          <img src="/faviicon.png" alt="Loot Master" className="h-full w-full object-cover" />
                        </span>
                      </div>

                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[#f5d17a]">{game.tag}</p>
                        {isDisabledForPublic ? (
                          <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[0.5rem] font-bold uppercase tracking-[0.15em] text-amber-100">
                            Disabled
                          </span>
                        ) : (
                          <span className="rounded-full border border-[#d4af6a]/45 bg-[#d4af6a]/10 px-2 py-1 text-[0.5rem] font-bold uppercase tracking-[0.15em] text-[#f8d889]">
                            Live
                          </span>
                        )}
                      </div>

                      <h2 className="text-center text-xl font-black uppercase tracking-[0.06em] text-[#f8d889] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-[1.35rem]">
                        {game.shortTitle.toUpperCase()}
                      </h2>

                      <p className="mt-3 text-center text-[0.72rem] leading-5 text-[#f0f4ff] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{game.description}</p>

                      <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[0.8rem] border border-[#f1d787]/80 bg-[linear-gradient(180deg,#f6d98f_0%,#d7a74a_26%,#b6782d_58%,#f5d889_100%)] px-4 py-3 text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#1e1205] shadow-[inset_0_1px_0_rgba(255,245,211,0.85),inset_0_-2px_0_rgba(120,75,14,0.45),0_10px_24px_rgba(183,120,45,0.34),0_0_18px_rgba(212,175,106,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,245,211,0.9),inset_0_-2px_0_rgba(120,75,14,0.45),0_12px_26px_rgba(183,120,45,0.42),0_0_22px_rgba(212,175,106,0.22)]">
                        <span className="inline-flex items-center gap-2">
                          Enter hub
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
