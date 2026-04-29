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
    <footer className={`mt-auto border-t backdrop-blur-xl ${
      isTbc 
        ? "border-[#a8ff9f]/15 bg-[#0a1a0c]/88" 
        : isClassic
        ? "border-[#e9b775]/18 bg-[#1a120b]/88"
        : isPandaria
        ? "border-[#8df0c8]/18 bg-[#071b14]/88"
        : "border-[#ffd76a]/10 bg-[#08111f]/88"
    }`}>
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
                isTbc ? "text-[#d4ffcc]" : isClassic ? "text-[#ffd9a7]" : isPandaria ? "text-[#c5ffe8]" : "text-[#ffc94d]"
              }`}>Loot Master</span>
            </Link>
            <p className={`text-sm ${
              isTbc ? "text-[#b8e6b8]" : isClassic ? "text-[#e7c79d]" : isPandaria ? "text-[#b2ecd7]" : "text-[#cdb991]"
            }`}>
              Your treasure-themed marketplace for gold, accounts, and services in
              World of Warcraft.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : isClassic ? "text-[#f5c982]" : isPandaria ? "text-[#95f3cf]" : "text-[#ffc94d]"
            }`}>
              Navigation
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : isClassic ? "text-[#e7c79d] hover:text-[#ffe6c4]" : isPandaria ? "text-[#b2ecd7] hover:text-[#e5fff5]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Home
              </Link>
              <Link href="/games" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Games
              </Link>
              <Link href="/coins" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                LM Coins
              </Link>
              <Link href="/rewards" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Rewards
              </Link>
              <Link href="/profile" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Profile
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : isClassic ? "text-[#f5c982]" : isPandaria ? "text-[#95f3cf]" : "text-[#ffc94d]"
            }`}>
              Support
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <a
                href="mailto:support@lootmaster.com"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : isClassic ? "text-[#e7c79d] hover:text-[#ffe6c4]" : isPandaria ? "text-[#b2ecd7] hover:text-[#e5fff5]" : "text-[#cdb991] hover:text-[#8dd0ff]"
                }`}
              >
                Contact
              </a>
              <a
                href="#faq"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
                }`}
              >
                FAQ
              </a>
              <a
                href="#terms"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
                }`}
              >
                Terms
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : isClassic ? "text-[#f5c982]" : isPandaria ? "text-[#95f3cf]" : "text-[#ffc94d]"
            }`}>
              Community
            </h3>
            <div className="flex gap-3">
              <a
                href="#discord"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold text-white transition-colors ${
                  isTbc
                    ? "border-[#a8ff9f]/25 bg-[#1a3a20]/35 hover:bg-[#1a3a20]/50"
                    : isClassic
                    ? "border-[#e9b775]/25 bg-[#4e311a]/35 hover:bg-[#4e311a]/50"
                    : isPandaria
                    ? "border-[#8df0c8]/25 bg-[#185641]/35 hover:bg-[#185641]/50"
                    : "border-[#84d5ff]/18 bg-[#0d3f7a]/30 hover:bg-[#0d3f7a]/50"
                }`}
              >
                Discord
              </a>
              <a
                href="#twitter"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold text-white transition-colors ${
                  isTbc
                    ? "border-[#a8ff9f]/20 bg-[#a8ff9f]/10 hover:bg-[#a8ff9f]/15"
                    : isClassic
                    ? "border-[#f1c686]/20 bg-[#f1c686]/10 hover:bg-[#f1c686]/16"
                    : isPandaria
                    ? "border-[#8df0c8]/20 bg-[#8df0c8]/10 hover:bg-[#8df0c8]/16"
                    : "border-[#ffd76a]/14 bg-[#fff1be]/8 hover:bg-[#fff1be]/12"
                }`}
              >
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className={`h-px bg-gradient-to-r from-transparent ${
          isTbc ? "via-[#a8ff9f]/25" : isClassic ? "via-[#f1c686]/28" : isPandaria ? "via-[#8df0c8]/28" : "via-[#ffd76a]/20"
        } to-transparent`} />

        <div className={`flex flex-col items-center justify-between gap-4 text-xs md:flex-row md:gap-0 ${
          isTbc ? "text-[#b8e6b8]" : isClassic ? "text-[#d0ab7f]" : isPandaria ? "text-[#9ed7c3]" : "text-[#9c8765]"
        }`}>
          <p>&copy; {currentYear} Loot Master. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className={`transition-colors ${
              isTbc ? "hover:text-[#d4ffcc]" : isClassic ? "hover:text-[#ffe6c4]" : isPandaria ? "hover:text-[#e5fff5]" : "hover:text-[#dbcaa7]"
            }`}>
              Privacy
            </a>
            <a href="#cookies" className={`transition-colors ${
              isTbc ? "hover:text-[#d4ffcc]" : isClassic ? "hover:text-[#ffe6c4]" : isPandaria ? "hover:text-[#e5fff5]" : "hover:text-[#dbcaa7]"
            }`}>
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
