"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { subscribeToHotGames } from "../../lib/hot-games";
import { defaultHotGameIds, games } from "../data/games";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Jogos" },
  { href: "/coins", label: "LM Coins" },
  { href: "/rewards", label: "Brindes" },
  { href: "/profile", label: "Perfil" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [hotIds, setHotIds] = useState<string[]>(defaultHotGameIds);

  useEffect(() => subscribeToHotGames(setHotIds), []);

  const orderedGames = [...games].sort((a, b) => {
    const aHot = hotIds.includes(a.id);
    const bHot = hotIds.includes(b.id);

    if (aHot === bHot) {
      return 0;
    }

    return aHot ? -1 : 1;
  });

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#ffd76a]/10 bg-[#08111f]/84 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
              <Image
                src="/lootmasterlogo.png"
                alt="Loot Master Logo"
                width={70}
                height={70}
                className="h-16 w-auto"
              />
            </Link>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#dbcaa7] md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[#fff1be]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="hidden items-center gap-3 rounded-full border border-[#84d5ff]/18 bg-[#0c2848]/50 px-4 py-2.5 text-sm font-semibold text-[#eef8ff] transition-colors hover:bg-[#11325f] md:inline-flex"
            >
              <span className="flex h-6 w-6 flex-col items-center justify-center gap-1">
                <span className="h-0.5 w-4 rounded-full bg-[#4dc6ff]" />
                <span className="h-0.5 w-4 rounded-full bg-[#4dc6ff]" />
                <span className="h-0.5 w-4 rounded-full bg-[#4dc6ff]" />
              </span>
              Games
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="loot-gold-button rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-105"
            >
              Game
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 transition ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-[#050b14]/78 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-full max-w-[22rem] flex-col border-r border-[#ffd76a]/12 bg-[linear-gradient(180deg,#0f2240_0%,#07101d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#ffd76a]/10 pb-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
                Games
              </p>
              <h2 className="font-throne mt-3 text-4xl text-[#ffc94d]">
                Escolha seu jogo
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-[#ffd76a]/14 bg-[#fff1be]/8 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#fff1be]/12 hover:border-[#ffd76a]/20"
            >
              Fechar
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.26em] text-[#b39a74]">
            <span>Available</span>
            <span>{orderedGames.length}</span>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {orderedGames.map((game) => {
              const isHot = hotIds.includes(game.id);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between rounded-[1.4rem] border border-[#ffd76a]/10 bg-[rgba(255,241,190,0.04)] px-5 py-4 transition-colors hover:border-[#4dc6ff]/25 hover:bg-[#0d3f7a]/22"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {isHot ? (
                        <span className="rounded-full border border-[#ffd76a]/24 bg-[#f7ba2c]/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffc94d]">
                          Hot
                        </span>
                      ) : null}
                      <p className="text-base font-black text-[#ffc94d] transition-colors group-hover:text-[#d9f4ff]">
                        {game.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#bba685]">
                      {game.shortTitle}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#84d5ff]/18 bg-[#0d3f7a]/36 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c7ecff]">
                    {game.tag}
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
