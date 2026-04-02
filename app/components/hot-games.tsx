"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { defaultHotGameIds, games } from "../data/games";
import { subscribeToHotGames } from "../../lib/hot-games";
import { firebaseEnabled } from "../../lib/firebase";

export function HotGames() {
  const [hotIds, setHotIds] = useState<string[]>(defaultHotGameIds);

  useEffect(() => subscribeToHotGames(setHotIds), []);

  const hotGames = games.filter((game) => hotIds.includes(game.id));

  if (hotGames.length === 0) {
    return (
      <section
        id="hots"
        className="rounded-[2rem] border border-black/10 bg-zinc-950 px-8 py-10 text-white"
      >
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-300">
          Hots
        </p>
        <h2 className="mt-4 text-3xl font-black">Nenhum jogo em destaque agora.</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-300">
          {firebaseEnabled
            ? "Abra a pagina de admin para escolher quais jogos vao aparecer nessa area de tendencia."
            : "Configure o Firebase para controlar quais jogos vao aparecer nessa area de tendencia."}
        </p>
      </section>
    );
  }

  return (
    <section
      id="hots"
      className="rounded-[2rem] border border-black/10 bg-zinc-950 p-8 text-white shadow-[0_24px_80px_rgba(33,24,7,0.18)]"
    >
      <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-300">
            Hots
          </p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl">
            Jogos em tendencia para empurrar a conversao.
          </h2>
        </div>

        <Link
          href="/admin"
          className="inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          {firebaseEnabled ? "Gerenciar destaques" : "Configurar Firebase"}
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {hotGames.map((game) => (
          <article
            key={game.id}
            className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300/80">
                  Hot pick
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight">
                  {game.title}
                </h3>
              </div>

              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                {game.tag}
              </span>
            </div>

            <p className="mt-5 text-sm leading-7 text-zinc-300">
              {game.description}
            </p>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-sm font-semibold text-zinc-400">
                Em destaque pela equipe
              </span>
              <span className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-950">
                Trending
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
