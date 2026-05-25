"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isTbc = pathname?.includes("tbc-anniversary");
  const isClassic = pathname?.includes("classic-era");
  const isPandaria = pathname?.includes("mist-of-pandaria");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`relative mt-auto border-t backdrop-blur-xl ${
      isTbc 
        ? "border-[#a8ff9f]/15 bg-[#0a1a0c]/88" 
        : isClassic
        ? "border-[#e9b775]/18 bg-[#1a120b]/88"
        : isPandaria
        ? "border-[#8df0c8]/18 bg-[#071b14]/88"
        : "border-[#3daeff]/28 bg-[linear-gradient(180deg,rgba(28,42,68,0.94)_0%,rgba(16,29,50,0.95)_100%)]"
    }`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,rgba(0,229,255,0.05)_0%,rgba(0,229,255,0.65)_42%,rgba(243,200,79,0.6)_72%,rgba(243,200,79,0.05)_100%)]"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3 text-white">
              <Image
                src="/lootmasterlogo.png"
                alt="Loot Master Logo"
                width={56}
                height={56}
                className="h-14 w-auto"
              />
              <span className={`font-throne text-2xl ${
                isTbc ? "text-[#d4ffcc]" : isClassic ? "text-[#ffd9a7]" : isPandaria ? "text-[#c5ffe8]" : "text-[#eaf4ff]"
              }`}>Loot Master</span>
            </Link>
            <p className={`text-sm ${
              isTbc ? "text-[#b8e6b8]" : isClassic ? "text-[#e7c79d]" : isPandaria ? "text-[#b2ecd7]" : "text-[#aec5dc]"
            }`}>
              Your treasure-themed marketplace for gold, accounts, and services in
              World of Warcraft.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : isClassic ? "text-[#f5c982]" : isPandaria ? "text-[#95f3cf]" : "text-[#4be3c1]"
            }`}>
              Navigation
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : isClassic ? "text-[#e7c79d] hover:text-[#ffe6c4]" : isPandaria ? "text-[#b2ecd7] hover:text-[#e5fff5]" : "text-[#b8cee2] hover:text-[#91e5ff]"
              }`}>
                Home
              </Link>
              <Link href="/games" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#b8cee2] hover:text-[#91e5ff]"
              }`}>
                Games
              </Link>
              <Link href="/coins" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#b8cee2] hover:text-[#91e5ff]"
              }`}>
                LM Coins
              </Link>
              <Link href="/rewards" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#b8cee2] hover:text-[#91e5ff]"
              }`}>
                Rewards
              </Link>
              <Link href="/profile" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#b8cee2] hover:text-[#91e5ff]"
              }`}>
                Profile
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : isClassic ? "text-[#f5c982]" : isPandaria ? "text-[#95f3cf]" : "text-[#4be3c1]"
            }`}>
              Support
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <a
                href="mailto:support@lootmaster.com"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : isClassic ? "text-[#e7c79d] hover:text-[#ffe6c4]" : isPandaria ? "text-[#b2ecd7] hover:text-[#e5fff5]" : "text-[#b8cee2] hover:text-[#91e5ff]"
                }`}
              >
                Contact
              </a>
              <a
                href="#faq"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#b8cee2] hover:text-[#91e5ff]"
                }`}
              >
                FAQ
              </a>
              <a
                href="#terms"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#b8cee2] hover:text-[#91e5ff]"
                }`}
              >
                Terms
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : isClassic ? "text-[#f5c982]" : isPandaria ? "text-[#95f3cf]" : "text-[#4be3c1]"
            }`}>
              Community
            </h3>
            <div className="flex gap-3">
              <a
                href="#discord"
                className={`inline-flex items-center gap-2 rounded-[11px] border px-3 py-2 text-sm font-semibold text-white transition-all duration-200 ${
                  isTbc
                    ? "border-[#a8ff9f]/25 bg-[#1a3a20]/35 hover:bg-[#1a3a20]/50"
                    : isClassic
                    ? "border-[#e9b775]/25 bg-[#4e311a]/35 hover:bg-[#4e311a]/50"
                    : isPandaria
                    ? "border-[#8df0c8]/25 bg-[#185641]/35 hover:bg-[#185641]/50"
                    : "border-[#6c819f]/64 bg-[linear-gradient(180deg,rgba(58,66,84,0.96),rgba(47,55,71,0.96))] text-[#deecff] hover:border-[#4bc2ff]/74 hover:bg-[linear-gradient(180deg,rgba(39,66,106,0.96),rgba(29,50,84,0.96))]"
                }`}
              >
                Discord
              </a>
              <a
                href="#twitter"
                className={`inline-flex items-center gap-2 rounded-[11px] border px-3 py-2 text-sm font-semibold text-white transition-all duration-200 ${
                  isTbc
                    ? "border-[#a8ff9f]/20 bg-[#a8ff9f]/10 hover:bg-[#a8ff9f]/15"
                    : isClassic
                    ? "border-[#f1c686]/20 bg-[#f1c686]/10 hover:bg-[#f1c686]/16"
                    : isPandaria
                    ? "border-[#8df0c8]/20 bg-[#8df0c8]/10 hover:bg-[#8df0c8]/16"
                    : "border-[#f3c84f]/68 bg-[linear-gradient(180deg,rgba(72,55,21,0.94),rgba(62,47,18,0.94))] text-[#ffe8ac] hover:border-[#ffd776] hover:bg-[linear-gradient(180deg,rgba(83,63,24,0.96),rgba(72,55,21,0.96))]"
                }`}
              >
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className={`h-px bg-gradient-to-r from-transparent ${
          isTbc ? "via-[#a8ff9f]/25" : isClassic ? "via-[#f1c686]/28" : isPandaria ? "via-[#8df0c8]/28" : "via-[#3ec8ff]/35"
        } to-transparent`} />

        <div className={`flex flex-col items-center justify-between gap-4 text-xs md:flex-row md:gap-0 ${
          isTbc ? "text-[#b8e6b8]" : isClassic ? "text-[#d0ab7f]" : isPandaria ? "text-[#9ed7c3]" : "text-[#9eb8d1]"
        }`}>
          <p>&copy; {currentYear} Loot Master. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className={`transition-colors ${
              isTbc ? "hover:text-[#d4ffcc]" : isClassic ? "hover:text-[#ffe6c4]" : isPandaria ? "hover:text-[#e5fff5]" : "hover:text-[#d7ebff]"
            }`}>
              Privacy
            </a>
            <a href="#cookies" className={`transition-colors ${
              isTbc ? "hover:text-[#d4ffcc]" : isClassic ? "hover:text-[#ffe6c4]" : isPandaria ? "hover:text-[#e5fff5]" : "hover:text-[#d7ebff]"
            }`}>
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
