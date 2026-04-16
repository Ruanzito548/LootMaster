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
      className="loot-panel animate-hot-section-background relative overflow-hidden rounded-[2rem] p-8 text-white transition-all duration-500 hover:shadow-[0_0_80px_rgba(247,186,44,0.2),inset_0_0_80px_rgba(247,186,44,0.1)]"
    >
      {/* Orbe de luz flutuante superior esquerda */}
      <div className="animate-pulse-intense absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#f7ba2c]/15 blur-3xl" style={{ animationDuration: '6s' }} />
      
      {/* Orbe de luz flutuante inferior direita */}
      <div className="animate-pulse-intense absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-[#2db2ff]/10 blur-3xl" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      
      {/* Orbe de luz adicional no meio */}
      <div className="animate-pulse-intense absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[linear-gradient(135deg,#f7ba2c/5,#2db2ff/5)] blur-3xl" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      
      {/* Efeito de brilho radiante */}
      <div className="absolute inset-0 rounded-[2rem] opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-white/10 via-transparent to-transparent" />
      </div>

      {/* Borda superior com gradiente brilhante */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f7ba2c]/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      {/* Cantos brilhantes */}
      <div className="absolute top-0 left-0 w-20 h-20 border-t border-l border-[#f7ba2c]/20 rounded-tl-[2rem] opacity-0 hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-20 h-20 border-t border-r border-[#f7ba2c]/20 rounded-tr-[2rem] opacity-0 hover:opacity-100 transition-opacity duration-500" />

      {/* Efeito de fogo - labaredas na base */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none overflow-hidden rounded-b-[2rem]">
        {/* Labareda esquerda */}
        <div className="absolute bottom-0 left-[5%] w-20 h-32 bg-gradient-to-t from-[#ff4400] via-[#ff8800] to-transparent animate-flame" style={{ animationDelay: '0s' }} />
        
        {/* Labareda centro-esquerda */}
        <div className="absolute bottom-0 left-[25%] w-24 h-40 bg-gradient-to-t from-[#cc3300] via-[#ff6600] to-transparent animate-flame" style={{ animationDelay: '0.5s' }} />
        
        {/* Labareda centro */}
        <div className="absolute bottom-0 left-[45%] w-32 h-36 bg-gradient-to-t from-[#ff5500] via-[#ffaa00] to-transparent animate-flame" style={{ animationDelay: '1s' }} />
        
        {/* Labareda centro-direita */}
        <div className="absolute bottom-0 right-[25%] w-28 h-38 bg-gradient-to-t from-[#cc2200] via-[#ff7700] to-transparent animate-flame" style={{ animationDelay: '1.5s' }} />
        
        {/* Labareda direita */}
        <div className="absolute bottom-0 right-[5%] w-24 h-34 bg-gradient-to-t from-[#ff3300] via-[#ff9900] to-transparent animate-flame" style={{ animationDelay: '0.8s' }} />

        {/* Overlay de fogo adicional com blur */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#ff4400]/20 via-transparent to-transparent blur-2xl" />
      </div>

      {/* Brilho de fogo radiante na base */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#ff6600]/15 to-transparent pointer-events-none rounded-b-[2rem]" />

      <div className="relative z-10 flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d] drop-shadow-[0_0_10px_rgba(255,193,77,0.3)]">
            Hots
          </p>
          <h2 className="text-3xl font-black leading-tight text-[#ffc94d] sm:text-4xl drop-shadow-[0_0_20px_rgba(255,193,77,0.2)]">
            Highlights
          </h2>
        </div>

      </div>

      <div className="relative z-20 grid gap-5 lg:grid-cols-2">
        {hotGames.map((game, index) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className={`group relative overflow-hidden rounded-[1.75rem] border border-[#ffd76a]/12 p-6 backdrop-blur-sm transition-all duration-500 hover:border-[#4dc6ff]/40 hover:shadow-[0_0_50px_rgba(77,198,255,0.25),inset_0_0_50px_rgba(77,198,255,0.1)] hover:-translate-y-2 hover:scale-[1.02] ${
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
            {/* Elementos decorativos flutuantes */}
            <div className="absolute left-4 top-4 h-16 w-16 rounded-full bg-[#f7ba2c]/20 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-60 animate-pulse" />
            <div className="absolute bottom-4 right-4 h-20 w-20 rounded-full bg-[#4dc6ff]/15 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute right-8 top-8 h-12 w-12 rounded-full bg-[#ff6b6b]/10 blur-lg opacity-0 transition-opacity duration-500 group-hover:opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Efeito de brilho que passa pelo card */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            </div>

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#ffc94d]/85 group-hover:text-[#ffd76a] transition-colors duration-300">
                  Hot pick
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-[#ffc94d] group-hover:text-[#ffeb3b] group-hover:drop-shadow-[0_0_20px_rgba(255,235,59,0.5)] transition-all duration-300">
                  {game.title}
                </h3>
              </div>

              <span className="rounded-full border border-[#84d5ff]/20 bg-[#0d3f7a]/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff] group-hover:border-[#4dc6ff]/50 group-hover:bg-[#4dc6ff]/20 group-hover:shadow-[0_0_15px_rgba(77,198,255,0.3)] transition-all duration-300">
                {game.tag}
              </span>
            </div>

            <div className="relative z-10 mt-8 flex items-center justify-between border-t border-[#ffd76a]/10 pt-5 group-hover:border-[#4dc6ff]/30 transition-colors duration-300">
              <span className="text-sm font-semibold text-[#dbcaa7] group-hover:text-[#e8f4ff] transition-colors duration-300">
                Trending now
              </span>
              <span className="rounded-full bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2f1405] group-hover:shadow-[0_0_20px_rgba(247,186,44,0.4)] group-hover:scale-105 transition-all duration-300">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
