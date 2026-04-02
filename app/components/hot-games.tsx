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
        className="rounded-[2rem] border border-white/8 bg-[#0c1324] px-8 py-10 text-white"
      >
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
          Hots
        </p>
        <h2 className="mt-4 text-3xl font-black">No active highlights.</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
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
      className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,#133353_0%,#0b1324_38%,#070b14_100%)] p-8 text-white shadow-[0_24px_80px_rgba(2,8,23,0.45)]"
    >
      <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-200">
            Hots
          </p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl">Highlights</h2>
        </div>

      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {hotGames.map((game, index) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className={`rounded-[1.75rem] border border-white/10 bg-black/20 p-6 backdrop-blur-sm transition-colors hover:border-cyan-300/25 hover:bg-cyan-300/8 ${
              index < 2 ? "animate-hot-card" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200/80">
                  Hot pick
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight">
                  {game.title}
                </h3>
              </div>

              <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                {game.tag}
              </span>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-sm font-semibold text-slate-300">
                Trending now
              </span>
              <span className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-950">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
