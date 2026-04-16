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
            className={`rounded-[1.75rem] border border-[#ffd76a]/12 p-6 backdrop-blur-sm transition-colors hover:border-[#4dc6ff]/25 hover:bg-[#0d3f7a]/22 ${
              index < 2 ? "animate-hot-card" : ""
            }`}
            style={
              game.id === "tbc-anniversary"
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(255,191,68,0.14),rgba(14,57,112,0.28)), url('/wowtbc.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    backgroundImage:
                      "linear-gradient(180deg,rgba(255,191,68,0.09),rgba(14,57,112,0.16))",
                  }
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#ffc94d]/85">
                  Hot pick
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-[#ffc94d]">
                  {game.title}
                </h3>
              </div>

              <span className="rounded-full border border-[#84d5ff]/20 bg-[#0d3f7a]/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff]">
                {game.tag}
              </span>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[#ffd76a]/10 pt-5">
              <span className="text-sm font-semibold text-[#dbcaa7]">
                Trending now
              </span>
              <span className="rounded-full bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2f1405]">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
