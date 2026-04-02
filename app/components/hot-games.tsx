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
        className="rounded-[2rem] border border-slate-900/10 bg-white/80 px-8 py-10 text-slate-950"
      >
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-teal-700">
          Hots
        </p>
        <h2 className="mt-4 text-3xl font-black">Nenhum destaque ativo.</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          {firebaseEnabled
            ? "Abra o admin para escolher os destaques."
            : "Configure o Firebase para liberar os destaques."}
        </p>
      </section>
    );
  }

  return (
    <section
      id="hots"
      className="rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(135deg,#0f172a_0%,#164e63_100%)] p-8 text-white shadow-[0_24px_80px_rgba(8,47,73,0.22)]"
    >
      <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-200">
            Hots
          </p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl">
            Em destaque
          </h2>
        </div>

        <Link
          href="/admin"
          className="inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          Admin
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {hotGames.map((game) => (
          <article
            key={game.id}
            className="rounded-[1.75rem] border border-white/10 bg-white/8 p-6"
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
                Tendencia atual
              </span>
              <span className="rounded-full bg-cyan-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-950">
                Trending
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
