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
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
          Hots
        </p>
        <h2 className="mt-4 text-3xl font-black text-[#ffc94d]">
          No active highlights.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[#dbcaa7]">
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
      className="loot-panel rounded-[2rem] p-8 text-white"
    >
      <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
            Hots
          </p>
          <h2 className="text-3xl font-black leading-tight text-[#ffc94d] sm:text-4xl">
            Highlights
          </h2>
        </div>

      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {hotGames.map((game, index) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className={`group relative overflow-hidden rounded-[1.75rem] border border-[#ffd76a]/12 p-6 backdrop-blur-sm transition-all duration-500 hover:border-[#4dc6ff]/50 hover:shadow-[0_0_40px_rgba(77,198,255,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:scale-[1.01]`}
            style={
              game.id === "tbc-anniversary"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(255,191,68,0.14),rgba(14,57,112,0.28)), url('/wowtbc.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : game.id === "retail"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(255,191,68,0.14),rgba(14,57,112,0.28)), url('/midnightwallpaper.jpeg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    backgroundImage:
                      "linear-gradient(180deg,rgba(255,191,68,0.09),rgba(14,57,112,0.16))",
                  }
            }
          >
            {/* Efeito de brilho radial no hover */}
            <div className="absolute inset-0 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(77,198,255,0.15), transparent 70%)' }} />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#ffc94d]/85 group-hover:text-[#ffd76a] transition-colors duration-300">
                  Hot pick
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-[#ffc94d] group-hover:text-[#ffeb3b] transition-colors duration-300">
                  {game.title}
                </h3>
              </div>

              <span className="rounded-full border border-[#84d5ff]/20 bg-[#0d3f7a]/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff] group-hover:border-[#4dc6ff]/50 group-hover:bg-[#4dc6ff]/20 group-hover:shadow-[0_0_12px_rgba(77,198,255,0.3)] transition-all duration-300">
                {game.tag}
              </span>
            </div>

            <div className="relative z-10 mt-8 flex items-center justify-between pt-5">
              <span className="text-sm font-semibold text-[#dbcaa7] group-hover:text-[#c5e9ff] transition-colors duration-300">
                Trending now
              </span>
              <span className="rounded-full bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2f1405] group-hover:shadow-[0_0_16px_rgba(247,186,44,0.4)] group-hover:scale-105 transition-all duration-300">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
