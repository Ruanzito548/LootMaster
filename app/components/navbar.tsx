"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { User, onAuthStateChanged, signOut } from "firebase/auth";

import { subscribeToHotGames } from "../../lib/hot-games";
import { auth } from "../../lib/firebase";
import { defaultHotGameIds, games } from "../data/games";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/coins", label: "LM Coins" },
  { href: "/rewards", label: "Rewards" },
];

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [hotIds, setHotIds] = useState<string[]>(defaultHotGameIds);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const pathname = usePathname();
  const isTbc = pathname?.includes("tbc-anniversary");
  const isMidnight = pathname?.includes("retail");
  const isClassic = pathname?.includes("classic-era");
  const isPandaria = pathname?.includes("mist-of-pandaria");

  useEffect(() => subscribeToHotGames(setHotIds), []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  const logout = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
  };

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
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        isTbc 
          ? "border-[#a8ff9f]/20 bg-[#0a1a0c]/88" 
          : isMidnight
          ? "border-[#4dc6ff]/20 bg-[#071427]/88"
          : isClassic
          ? "border-[#f1c686]/22 bg-[#1c130b]/88"
          : isPandaria
          ? "border-[#8df0c8]/24 bg-[#071c16]/88"
          : "border-[#ee2222]/22 bg-[#000000]/92"
      }`}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2.5 text-sm font-semibold transition-colors ${
                isTbc
                  ? "border-[#a8ff9f]/25 bg-[#1a3a20]/50 text-[#e0ffe0] hover:bg-[#204a25]"
                  : isMidnight
                  ? "border-[#4dc6ff]/25 bg-[#0d2f55]/55 text-[#dff3ff] hover:bg-[#15467a]"
                  : isClassic
                  ? "border-[#e9b775]/28 bg-[#4e311a]/55 text-[#ffe8c9] hover:bg-[#5f3d22]"
                  : isPandaria
                  ? "border-[#8df0c8]/28 bg-[#185641]/55 text-[#e7fff6] hover:bg-[#226f54]"
                  : "border-[#ee2222]/20 bg-[#0a0000]/55 text-[#ee4444] hover:bg-[#150000]"
              }`}
              aria-label="Open side menu"
            >
              <span className="flex h-5 w-5 flex-col items-center justify-center gap-1">
                <span className={`h-0.5 w-4 rounded-full ${
                  isTbc ? "bg-[#a8ff9f]" : isMidnight ? "bg-[#7fd4ff]" : isClassic ? "bg-[#f1c686]" : isPandaria ? "bg-[#8df0c8]" : "bg-[#ee2222]"
                }`} />
                <span className={`h-0.5 w-4 rounded-full ${
                  isTbc ? "bg-[#a8ff9f]" : isMidnight ? "bg-[#7fd4ff]" : isClassic ? "bg-[#f1c686]" : isPandaria ? "bg-[#8df0c8]" : "bg-[#ee2222]"
                }`} />
                <span className={`h-0.5 w-4 rounded-full ${
                  isTbc ? "bg-[#a8ff9f]" : isMidnight ? "bg-[#7fd4ff]" : isClassic ? "bg-[#f1c686]" : isPandaria ? "bg-[#8df0c8]" : "bg-[#ee2222]"
                }`} />
              </span>
              <span className="hidden sm:inline">Menu</span>
            </button>

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

          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full border px-3 py-1.5 transition-colors ${
                  isLinkActive(pathname, link.href)
                    ? isTbc
                      ? "border-[#a8ff9f]/35 bg-[#a8ff9f]/12 text-[#e4ffe0]"
                      : isMidnight
                      ? "border-[#4dc6ff]/35 bg-[#4dc6ff]/14 text-[#e4f6ff]"
                      : isClassic
                      ? "border-[#f1c686]/35 bg-[#f1c686]/14 text-[#ffeed5]"
                      : isPandaria
                      ? "border-[#8df0c8]/35 bg-[#8df0c8]/14 text-[#e7fff6]"
                      : "border-[#ffd76a]/28 bg-[#ffd76a]/10 text-[#fff1be]"
                    : isTbc
                    ? "border-transparent text-[#b8e6b8] hover:text-[#d4ffcc]"
                    : isMidnight
                    ? "border-transparent text-[#a8d8ff] hover:text-[#dff3ff]"
                    : isClassic
                    ? "border-transparent text-[#e8c79e] hover:text-[#ffe6c4]"
                    : isPandaria
                    ? "border-transparent text-[#b9eddc] hover:text-[#e5fff5]"
                    : "border-transparent text-[#ee4444] hover:text-[#ff2222]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Link
                  href="/profile"
                  className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                    isTbc
                      ? "border-[#a8ff9f]/28 bg-[#1a3a20]/55 text-[#e4ffe0] hover:bg-[#204a25]"
                      : isMidnight
                      ? "border-[#4dc6ff]/28 bg-[#0d2f55]/60 text-[#e4f6ff] hover:bg-[#15467a]"
                      : isClassic
                      ? "border-[#f1c686]/32 bg-[#4e311a]/55 text-[#ffeed5] hover:bg-[#5f3d22]"
                      : isPandaria
                      ? "border-[#8df0c8]/32 bg-[#185641]/55 text-[#e7fff6] hover:bg-[#226f54]"
                      : "border-[#f7ba2c]/28 bg-[#f7ba2c]/12 text-[#1a0a00] hover:bg-[#f7ba2c]/20"
                  }`}
                >
                  My Profile
                </Link>

                <button
                  type="button"
                  onClick={() => void logout()}
                  className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                    isTbc
                      ? "border-[#a8ff9f]/25 bg-[#0f2713]/50 text-[#d4ffcc] hover:bg-[#153518]"
                      : isMidnight
                      ? "border-[#4dc6ff]/25 bg-[#08213c]/60 text-[#dff3ff] hover:bg-[#0d2f55]"
                      : isClassic
                      ? "border-[#f1c686]/25 bg-[#3d2614]/55 text-[#ffeed5] hover:bg-[#4a2f19]"
                      : isPandaria
                      ? "border-[#8df0c8]/25 bg-[#103e31]/55 text-[#e7fff6] hover:bg-[#155341]"
                      : "border-[#f7ba2c]/22 bg-[#0a0000]/55 text-[#f7ba2c] hover:bg-[#f7ba2c]/12"
                  }`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                  isTbc
                    ? "border-[#a8ff9f]/28 bg-[#1a3a20]/55 text-[#e4ffe0] hover:bg-[#204a25]"
                    : isMidnight
                    ? "border-[#4dc6ff]/28 bg-[#0d2f55]/60 text-[#e4f6ff] hover:bg-[#15467a]"
                    : isClassic
                    ? "border-[#f1c686]/32 bg-[#4e311a]/55 text-[#ffeed5] hover:bg-[#5f3d22]"
                    : isPandaria
                    ? "border-[#8df0c8]/32 bg-[#185641]/55 text-[#e7fff6] hover:bg-[#226f54]"
                    : "border-[#f7ba2c]/28 bg-[#f7ba2c]/12 text-[#1a0a00] hover:bg-[#f7ba2c]/20"
              </Link>
            )}

            <Link
              href="/admin"
              className={`hidden rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors xl:inline-flex ${
                isTbc
                  ? "border-[#a8ff9f]/25 bg-[#1a3a20]/45 text-[#e0ffe0] hover:bg-[#204a25]"
                  : isMidnight
                  ? "border-[#4dc6ff]/25 bg-[#0d2f55]/50 text-[#dff3ff] hover:bg-[#15467a]"
                  : isClassic
                  ? "border-[#e9b775]/25 bg-[#4e311a]/45 text-[#ffe8c9] hover:bg-[#5f3d22]"
                  : isPandaria
                  ? "border-[#8df0c8]/25 bg-[#185641]/45 text-[#e7fff6] hover:bg-[#226f54]"
                  : "border-[#ee2222]/18 bg-[#0a0000]/45 text-[#ee4444] hover:bg-[#150000]"
            </Link>
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
          className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${
            isTbc 
              ? "bg-[#030805]/78" 
              : isMidnight
              ? "bg-[#020812]/80"
              : isClassic
              ? "bg-[#120c06]/80"
              : isPandaria
              ? "bg-[#03110d]/80"
              : "bg-[#000000]/82"
          } ${isOpen ? "opacity-100" : "opacity-0"}`}
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-full max-w-[22rem] flex-col border-r p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ${
            isTbc
              ? "border-[#a8ff9f]/15 bg-[linear-gradient(180deg,#1a3a20_0%,#0a1a0c_100%)]"
              : isMidnight
              ? "border-[#4dc6ff]/18 bg-[linear-gradient(180deg,#0c2a4d_0%,#061323_100%)]"
              : isClassic
              ? "border-[#e9b775]/18 bg-[linear-gradient(180deg,#4a2e18_0%,#1b120a_100%)]"
              : isPandaria
              ? "border-[#8df0c8]/18 bg-[linear-gradient(180deg,#1b5f49_0%,#092118_100%)]"
              : "border-[#ee2222]/18 bg-[linear-gradient(180deg,#150000_0%,#000000_100%)]"
          } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b pb-5">
            <div>
              <p className={`text-sm font-bold uppercase tracking-[0.28em] ${
                isTbc ? "text-[#a8ff9f]" : isMidnight ? "text-[#7fd4ff]" : "text-[#ee2222]"
              }`}>
                Games
              </p>
              <h2 className={`font-throne mt-3 text-4xl ${
                isTbc ? "text-[#d4ffcc]" : isMidnight ? "text-[#b8e0ff]" : "text-[#ee2222]"
              }`}>
                Choose your game
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold text-white transition-colors ${
                isTbc
                  ? "border-[#a8ff9f]/20 bg-[#a8ff9f]/10 hover:bg-[#a8ff9f]/15 hover:border-[#a8ff9f]/25"
                  : isMidnight
                  ? "border-[#4dc6ff]/20 bg-[#4dc6ff]/10 hover:bg-[#4dc6ff]/16 hover:border-[#4dc6ff]/30"
                    : "border-[#f7ba2c]/18 bg-[#f7ba2c]/8 hover:bg-[#f7ba2c]/12 hover:border-[#f7ba2c]/28"
              }`}
            >
              Close
            </button>
          </div>

          <div className={`mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.26em] ${
            isTbc ? "text-[#b8e6b8]" : isMidnight ? "text-[#a8d0ff]" : "text-[#883333]"
          }`}>
            <span>Available</span>
            <span>{orderedGames.length}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {links.map((link) => (
              <Link
                key={`drawer-${link.href}`}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`rounded-xl border px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
                  isLinkActive(pathname, link.href)
                    ? isTbc
                      ? "border-[#a8ff9f]/30 bg-[#a8ff9f]/12 text-[#e4ffe0]"
                      : isMidnight
                      ? "border-[#4dc6ff]/30 bg-[#4dc6ff]/12 text-[#e4f6ff]"
                      : "border-[#f7ba2c]/22 bg-[#f7ba2c]/8 text-[#1a0a00]"
                    : isTbc
                    ? "border-[#a8ff9f]/12 text-[#b8e6b8] hover:border-[#a8ff9f]/24"
                    : isMidnight
                    ? "border-[#4dc6ff]/14 text-[#a8d8ff] hover:border-[#4dc6ff]/28"
                    : "border-[#ee2222]/12 text-[#ee4444] hover:border-[#ee2222]/24"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {orderedGames.map((game) => {
              const isHot = hotIds.includes(game.id);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  onClick={() => setIsOpen(false)}
                  className={`group relative overflow-hidden flex items-center justify-between rounded-[1.4rem] border px-5 py-4 transition-all ${
                    isTbc
                      ? "border-[#a8ff9f]/15 hover:border-[#a8ff9f]/30 hover:shadow-[0_0_20px_rgba(168,255,159,0.15)]"
                      : isMidnight
                      ? "border-[#4dc6ff]/18 hover:border-[#4dc6ff]/35 hover:shadow-[0_0_20px_rgba(77,198,255,0.2)]"
                      : "border-[#f7ba2c]/24 hover:border-[#ee2222]/35 hover:shadow-[0_0_20px_rgba(200,20,20,0.2)]"
                  }`}
                  style={{
                    backgroundImage:
                      game.id === "tbc-anniversary"
                        ? "url('/wow/wow-tbc/tbc-logo.jpg')"
                        : game.id === "retail"
                        ? "url('/wow/wow-retail/midinight-logo.jpeg')"
                        : game.id === "classic-era"
                        ? "url('/wow/wow-classic-era/classic-era-logo.jpg')"
                        : game.id === "mist-of-pandaria"
                        ? "url('/wow/wow-pandaria/pandaria-logo.jpg')"
                        : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {isHot ? (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                          isTbc
                            ? "border-[#a8ff9f]/30 bg-[#a8ff9f]/15 text-[#d4ffcc]"
                            : isMidnight
                            ? "border-[#4dc6ff]/28 bg-[#4dc6ff]/14 text-[#dff3ff]"
                            : "border-[#ffd76a]/24 bg-[#f7ba2c]/14 text-[#ffc94d]"
                        }`}>
                          Hot
                        </span>
                      ) : null}
                      <p className={`text-base font-black transition-colors ${
                        isTbc
                          ? "text-[#d4ffcc] group-hover:text-[#e8ffeb]"
                          : isMidnight
                          ? "text-[#c7e7ff] group-hover:text-[#f0f9ff]"
                          : "text-[#ee2222] group-hover:text-[#ff4444]"
                      }`}>
                        {game.title}
                      </p>
                    </div>
                    <p className={`mt-1 text-xs ${
                      isTbc ? "text-[#a8d0a8]" : isMidnight ? "text-[#9dc4ea]" : "text-[#993333]"
                    }`}>
                      {game.shortTitle}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
                    isTbc
                      ? "border-[#a8ff9f]/30 bg-[#a8ff9f]/20 text-[#e0ffe0] group-hover:border-[#a8ff9f]/50 group-hover:shadow-[0_0_12px_rgba(168,255,159,0.3)]"
                      : isMidnight
                      ? "border-[#4dc6ff]/30 bg-[#4dc6ff]/18 text-[#dff3ff] group-hover:border-[#7fd4ff]/55 group-hover:shadow-[0_0_12px_rgba(77,198,255,0.35)]"
                      : "border-[#f7ba2c]/28 bg-[#f7ba2c]/14 text-[#1a0a00] group-hover:border-[#f7ba2c]/50 group-hover:shadow-[0_0_12px_rgba(247,186,44,0.3)]"
                  }`}>
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
