"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Gift, Sparkles, Trophy } from "lucide-react";

import { defaultHotGameIds, games } from "./data/games";
import { useProfileSession } from "./profile/use-profile-session";
import { canAccessGame, sanitizeGameConfiguration, type GameConfiguration } from "@/lib/game-configuration";

const heroArtByGame: Record<string, string> = {
  "tbc-anniversary": "/wow/wow-tbc/tbc-logo.jpg",
  retail: "/wow/wow-retail/midinight-logo.jpeg",
  "classic-era": "/wow/wow-classic-era/classic-era-logo.jpg",
  "mist-of-pandaria": "/wow/wow-pandaria/pandaria-logo.jpg",
};

export default function Home() {
  const { profile } = useProfileSession();
  const isAdmin = profile?.isAdmin === true;
  const [gameConfig, setGameConfig] = useState<GameConfiguration | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/game-configuration", { cache: "no-store" });
        const payload = (await response.json()) as { config?: unknown };

        if (!cancelled && payload?.config) {
          setGameConfig(sanitizeGameConfiguration(payload.config));
        }
      } catch {
        if (!cancelled) {
          setGameConfig(null);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleGames = useMemo(
    () => (gameConfig ? games.filter((game) => canAccessGame(gameConfig, game.id, isAdmin)) : []),
    [gameConfig, isAdmin],
  );

  const featuredGames = useMemo(
    () =>
      visibleGames
        .filter((game) => defaultHotGameIds.includes(game.id))
        .concat(visibleGames.filter((game) => !defaultHotGameIds.includes(game.id))),
    [visibleGames],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (featuredGames.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % featuredGames.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [featuredGames.length]);

  const safeActiveIndex = featuredGames.length > 0 ? activeIndex % featuredGames.length : 0;
  const activeGame = featuredGames[safeActiveIndex] ?? featuredGames[0] ?? null;

  return (
    <div className="loot-shell gm-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section
          className="relative overflow-hidden rounded-[2rem] border border-[#d4af6a]/70 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.38)] sm:p-8 lg:p-10"
          style={{
            backgroundImage: "url('/home/bghero.png')",
            backgroundPosition: "center",
            backgroundSize: "115%",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(255,255,255,0.03),transparent_34%),radial-gradient(circle_at_18%_100%,rgba(0,0,0,0.18),transparent_36%)]" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex min-h-[26rem] flex-col justify-between gap-4">
              <div className="flex flex-1 items-center">
                <img src="/home/logoescrita.png" alt="Loot Master" className="h-56 w-auto object-contain sm:h-80 lg:h-[12rem]" />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href={activeGame ? `/games/${activeGame.id}` : "/games"} className="gm-button gm-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs uppercase tracking-[0.14em]">
                  Enter {activeGame?.shortTitle ?? "Launcher"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/rewards" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs uppercase tracking-[0.14em]">
                  <Gift className="h-3.5 w-3.5" />
                  Rewards
                </Link>
                <Link href="/profile" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs uppercase tracking-[0.14em]">
                  <Trophy className="h-3.5 w-3.5" />
                  Progress
                </Link>
              </div>
            </div>

            <div className="relative h-[20rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111317] sm:h-[24rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeGame?.id ?? "no-game"}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.45 }}
                  className="absolute inset-0"
                  style={{
                    backgroundImage: activeGame
                      ? `linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.32)), url('${heroArtByGame[activeGame.id] ?? heroArtByGame.retail}')`
                      : "linear-gradient(180deg,rgba(0,0,0,0.24),rgba(0,0,0,0.62))",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              </AnimatePresence>

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.42)_86%)]" />

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Featured game</p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {gameConfig === null ? "Loading games..." : activeGame?.title ?? "No game available"}
                </h2>
                <div className="mt-3 flex items-center gap-2">
                  {featuredGames.map((game, index) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${index === safeActiveIndex ? "w-8 bg-[#6ee7ff]" : "w-3 bg-white/35"}`}
                      aria-label={`Show ${game.title}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="relative overflow-hidden rounded-[2rem] border border-[#d4af6a]/70 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-6 lg:p-8"
          style={{
            backgroundImage: "url('/home/bghero.png')",
            backgroundPosition: "center",
            backgroundSize: "115%",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <div className="absolute -left-10 top-4 h-44 w-44 rounded-full bg-[#d4af6a]/10 blur-3xl" />
            <div className="absolute right-10 top-0 h-52 w-52 rounded-full bg-[#3b4a8a]/20 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(2,4,8,0.75))]" />
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:pl-2">
              <div className="space-y-3 lg:flex-1 lg:text-center">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.36em] text-[#d9b76a]">Explore worlds. Conquer legends.</p>
                <div className="flex items-center justify-center gap-4 lg:justify-center">
                  <h2 className="font-throne text-4xl font-black uppercase tracking-[0.04em] text-[#f5d17a] sm:text-5xl lg:text-[4.2rem]">Featured Games</h2>
                </div>
                <div className="mx-auto h-px w-full max-w-[28rem] bg-[linear-gradient(90deg,rgba(212,175,106,0.9),rgba(212,175,106,0.14))]" />
                <p className="mx-auto max-w-xl text-sm text-[#9eb4d4] sm:text-base">Explore legendary worlds and begin your next adventure.</p>
              </div>

              <Link href="/games" className="gm-button gm-button-secondary inline-flex items-center gap-2 self-start rounded-xl border border-[#d4af6a]/70 bg-[#0a1018]/70 px-4 py-3 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[#f5d17a] shadow-[0_0_20px_rgba(212,175,106,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5d17a]/80 hover:text-[#f8e1a2] lg:self-center">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {visibleGames.map((game) => (
                <Link key={game.id} href={`/games/${game.id}`} className="block" aria-label={`Open ${game.shortTitle}`}>
                  <motion.article
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="group relative h-[28.5rem] overflow-hidden rounded-[1.5rem] border border-[#d4af6a]/80 bg-[#0a0f18] shadow-[0_20px_45px_rgba(0,0,0,0.48)] transition-all duration-300 hover:border-[#f5d17a] hover:shadow-[0_24px_52px_rgba(212,175,106,0.18)]"
                  >
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

                        <h3 className="text-center text-xl font-black uppercase tracking-[0.06em] text-[#f8d889] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-[1.35rem]">
                          {game.shortTitle.toUpperCase()}
                        </h3>

                        <p className="mt-3 text-center text-[0.72rem] leading-5 text-[#f0f4ff] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{game.description}</p>

                        <span className="group/btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[0.8rem] border border-[#f1d787]/80 bg-[linear-gradient(180deg,#f6d98f_0%,#d7a74a_26%,#b6782d_58%,#f5d889_100%)] px-4 py-3 text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#1e1205] shadow-[inset_0_1px_0_rgba(255,245,211,0.85),inset_0_-2px_0_rgba(120,75,14,0.45),0_10px_24px_rgba(183,120,45,0.34),0_0_18px_rgba(212,175,106,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,245,211,0.9),inset_0_-2px_0_rgba(120,75,14,0.45),0_12px_26px_rgba(183,120,45,0.42),0_0_22px_rgba(212,175,106,0.22)]">
                          <span className="inline-flex items-center gap-2">
                            Enter
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                          </span>
                        </span>
                      </div>
                    </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
