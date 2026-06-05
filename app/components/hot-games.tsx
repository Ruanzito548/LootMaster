"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { subscribeToHotGames } from "../../lib/hot-games";
import { firebaseEnabled } from "../../lib/firebase";
import { defaultHotGameIds, games } from "../data/games";

export function HotGames() {
  const [hotIds, setHotIds] = useState<string[]>(defaultHotGameIds);

  useEffect(() => subscribeToHotGames(setHotIds), []);

  const hotGames = games.filter((game) => hotIds.includes(game.id));

  if (hotGames.length === 0) {
    return (
      <section
        id="hots"
        className="loot-panel rounded-[2rem] px-8 py-10 text-white"
      >
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#4be3c1]">
          Hots
        </p>
        <h2 className="mt-4 text-3xl font-black text-[#eaf4ff]">
          No active highlights.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[#aec5dc]">
          {firebaseEnabled
            ? "Open admin to choose the highlighted games."
            : "Configure Firebase to enable highlights."}
        </p>
      </section>
    );
  }

  return (
    <section
      id="hots"
      className="rounded-[1.2rem] border border-[#2f6aa1]/44 bg-[linear-gradient(180deg,rgba(29,43,70,0.88),rgba(18,31,53,0.9))] p-8 text-white"
    >
      <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#4be3c1]">
            Hots
          </p>
          <h2 className="text-3xl font-black leading-tight text-[#eaf4ff] sm:text-4xl">
            Highlights
          </h2>
        </div>

      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {hotGames.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className={`group relative overflow-hidden rounded-[1.1rem] border border-[#2f6aa1]/44 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#48cfff]/52 hover:shadow-[0_0_28px_rgba(72,207,255,0.22)] hover:-translate-y-1`}
            style={
              game.id === "tbc-anniversary"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(43,78,126,0.44),rgba(18,36,62,0.56)), url('/wow/wow-tbc/tbc-logo.avif')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : game.id === "retail"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(43,78,126,0.44),rgba(18,36,62,0.56)), url('/wow/wow-retail/midinight-logo.jpeg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : game.id === "classic-era"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(43,78,126,0.4),rgba(22,36,58,0.58)), url('/wow/wow-classic-era/classic-era-logo.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : game.id === "mist-of-pandaria"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(43,78,126,0.4),rgba(22,36,58,0.58)), url('/wow/wow-pandaria/pandaria-logo.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    backgroundImage:
                      "linear-gradient(180deg,rgba(37,64,103,0.8),rgba(20,33,56,0.9))",
                  }
            }
          >
            <div className="absolute inset-0 rounded-[1.1rem] opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100" style={{ background: "radial-gradient(circle at 50% 0%, rgba(75,227,193,0.14), transparent 72%)" }} />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black leading-tight text-[#edf6ff] transition-colors duration-300 group-hover:text-[#ffffff]">
                  {game.title}
                </h3>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex items-center justify-between pt-5">
              <span className="text-sm font-semibold text-[#aec5dc] transition-colors duration-300 group-hover:text-[#d7e8f8]">
                {game.shortTitle}
              </span>
              <span className="loot-gold-button inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-[0.14em]">
                {game.title}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
