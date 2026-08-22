"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Flame, Gift, ShieldCheck, Sparkles, Trophy } from "lucide-react";

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
        <section className="gm-glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(255,255,255,0.03),transparent_34%),radial-gradient(circle_at_18%_100%,rgba(0,0,0,0.18),transparent_36%)]" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <span className="gm-badge inline-flex items-center gap-2 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em]">
                <Sparkles className="h-3.5 w-3.5" />
                Seasonal launcher
              </span>

              <h1 className="font-throne text-5xl font-black leading-[0.95] text-[#eaf4ff] sm:text-6xl lg:text-7xl">
                MMO MARKETPLACE
                <br />
                REFORGED
              </h1>

              <p className="gm-subtitle max-w-xl text-sm leading-7 sm:text-base">
                Fast orders, clean routing, one hub.
              </p>

              <div className="flex flex-wrap gap-3">
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

              <div className="grid gap-3 sm:grid-cols-3">
                <article className="gm-panel rounded-xl px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Featured reward</p>
                  <p className="mt-2 text-sm font-black text-[color:var(--text-main)]">Mythic Drop</p>
                </article>
                <article className="gm-panel rounded-xl px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Season</p>
                  <p className="mt-2 text-sm font-black text-[color:var(--theme-warm)]">Nightfall</p>
                </article>
                <article className="gm-panel rounded-xl px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Security</p>
                  <p className="mt-2 text-sm font-black text-[color:var(--text-main)]">Protected</p>
                </article>
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

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="gm-panel rounded-2xl px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white/5 p-2 text-[color:var(--theme-accent)]">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Live activity</p>
                <p className="text-sm font-black text-[color:var(--text-main)]">126 orders today</p>
              </div>
            </div>
          </article>

          <article className="gm-panel rounded-2xl px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white/5 p-2 text-[color:var(--theme-accent)]">
                <Gift className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Reward road</p>
                <p className="text-sm font-black text-[color:var(--text-main)]">New seasonal nodes</p>
              </div>
            </div>
          </article>

          <article className="gm-panel rounded-2xl px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white/5 p-2 text-[color:var(--theme-accent)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Trusted checkout</p>
                <p className="text-sm font-black text-[color:var(--text-main)]">Protected payment flow</p>
              </div>
            </div>
          </article>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-throne text-3xl font-black text-[color:var(--text-main)] sm:text-4xl">Featured Games</h2>
            <Link href="/games" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-[0.13em]">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visibleGames.map((game) => {
              const isDisabledForPublic = gameConfig ? !gameConfig.byGame[game.id]?.enabled : false;

              return (
              <motion.article
                key={game.id}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#171a20]"
              >
                <div
                  className="h-56 transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.32)), url('${heroArtByGame[game.id] ?? heroArtByGame.retail}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_28%,rgba(0,0,0,0.18)_76%,rgba(0,0,0,0.46)_100%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(135deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(255,255,255,0.02))]" />

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,11,14,0.54),rgba(10,11,14,0.82))] px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-[2px]">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-[color:var(--text-main)]">{game.shortTitle}</h3>
                      {isDisabledForPublic ? (
                        <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-amber-100">
                          Disabled (Admin Only)
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-[color:var(--text-main)]">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[0.7rem] leading-5 text-[color:var(--text-muted)]">{game.description}</p>
                    <Link href={`/games/${game.id}`} className="gm-button gm-button-primary mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[0.62rem] uppercase tracking-[0.14em]">
                      Enter
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
