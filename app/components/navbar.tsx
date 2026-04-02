"use client";

import Link from "next/link";
import { useState } from "react";

import { games } from "../data/games";

const links = [
  { href: "#hots", label: "Hots" },
  { href: "#games", label: "Games" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#070b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                ≡
              </span>
              Games
            </button>

            <Link href="/" className="font-throne text-2xl text-white">
              Loot Master
            </Link>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 md:inline-flex"
            >
              Admin
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
            >
              Escolher jogo
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
          aria-label="Fechar menu"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-[#020617]/70 backdrop-blur-sm transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-full max-w-[22rem] flex-col border-r border-white/8 bg-[linear-gradient(180deg,#0d1528_0%,#09101f_100%)] p-6 text-white shadow-[0_24px_80px_rgba(2,8,23,0.55)] transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/8 pb-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
                Games
              </p>
              <h2 className="font-throne mt-3 text-4xl">Escolha seu jogo</h2>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Fechar
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.26em] text-slate-500">
            <span>Disponiveis</span>
            <span>{games.length}</span>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {games.map((game) => (
              <Link
                key={game.id}
                href="#games"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between rounded-[1.4rem] border border-white/8 bg-white/4 px-5 py-4 transition-colors hover:border-cyan-300/25 hover:bg-cyan-300/8"
              >
                <div>
                  <p className="text-lg font-black transition-colors group-hover:text-cyan-100">
                    {game.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{game.shortTitle}</p>
                </div>
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                  {game.tag}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
            <p className="text-sm font-semibold text-slate-300">Fluxo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Game", "Servidor", "Faccao"].map((step, index) => (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${
                    index === 0
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
