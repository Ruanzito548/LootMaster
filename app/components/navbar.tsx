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
  const isAdmin = pathname?.startsWith("/admin");

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
          : isAdmin
          ? "border-[#4ade80]/20 bg-black/90"
          : "border-[#2fd3ff]/24 bg-[linear-gradient(180deg,rgba(16,24,42,0.96)_0%,rgba(10,17,32,0.94)_100%)]"
      }`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(0,229,255,0.05)_0%,rgba(0,229,255,0.85)_36%,rgba(255,201,77,0.8)_70%,rgba(255,201,77,0.06)_100%)]"
        />
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
                  : isAdmin
                  ? "border-[#4ade80]/25 bg-[#052e16]/60 text-[#86efac] hover:bg-[#052e16]"
                    : "border-[#43d5ff]/30 bg-[#102843]/80 text-[#ddf7ff] hover:border-[#6be0ff]/45 hover:bg-[#15355b]"
              }`}
              aria-label="Open side menu"
            >
              <span className="flex h-5 w-5 flex-col items-center justify-center gap-1">
                <span className={`h-0.5 w-4 rounded-full ${
                  isTbc ? "bg-[#a8ff9f]" : isMidnight ? "bg-[#7fd4ff]" : isClassic ? "bg-[#f1c686]" : isPandaria ? "bg-[#8df0c8]" : isAdmin ? "bg-[#4ade80]" : "bg-[#4dc6ff]"
                }`} />
                <span className={`h-0.5 w-4 rounded-full ${
                  isTbc ? "bg-[#a8ff9f]" : isMidnight ? "bg-[#7fd4ff]" : isClassic ? "bg-[#f1c686]" : isPandaria ? "bg-[#8df0c8]" : isAdmin ? "bg-[#4ade80]" : "bg-[#4dc6ff]"
                }`} />
                <span className={`h-0.5 w-4 rounded-full ${
                  isTbc ? "bg-[#a8ff9f]" : isMidnight ? "bg-[#7fd4ff]" : isClassic ? "bg-[#f1c686]" : isPandaria ? "bg-[#8df0c8]" : isAdmin ? "bg-[#4ade80]" : "bg-[#4dc6ff]"
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
                      : isAdmin
                      ? "border-[#4ade80]/35 bg-[#4ade80]/12 text-[#86efac]"
                      : "border-[#46d8ff]/40 bg-[#46d8ff]/14 text-[#e8faff] shadow-[0_0_0_1px_rgba(70,216,255,0.2)]"
                    : isTbc
                    ? "border-transparent text-[#b8e6b8] hover:text-[#d4ffcc]"
                    : isMidnight
                    ? "border-transparent text-[#a8d8ff] hover:text-[#dff3ff]"
                    : isClassic
                    ? "border-transparent text-[#e8c79e] hover:text-[#ffe6c4]"
                    : isPandaria
                    ? "border-transparent text-[#b9eddc] hover:text-[#e5fff5]"
                    : isAdmin
                    ? "border-transparent text-[#4ade80] hover:text-[#86efac]"
                      : "border-transparent text-[#91b3d8] hover:border-[#46d8ff]/25 hover:text-[#dff6ff]"
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
                      : isAdmin
                      ? "border-[#4ade80]/28 bg-[#052e16]/60 text-[#86efac] hover:bg-[#052e16]"
                      : "border-[#2fd3ff]/38 bg-[#173350]/80 text-[#e9f8ff] hover:border-[#5bddff]/52 hover:bg-[#1f4368]"
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
                      : isAdmin
                      ? "border-[#4ade80]/22 bg-[#052e16]/55 text-[#86efac] hover:bg-[#052e16]"
                      : "border-[#4cb7ff]/30 bg-[#11243c]/78 text-[#cae6ff] hover:border-[#79ccff]/45 hover:bg-[#173356]"
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
                    : isAdmin
                    ? "border-[#4ade80]/28 bg-[#052e16]/60 text-[#86efac] hover:bg-[#052e16]"
                    : "border-[#2fd3ff]/38 bg-[#173350]/80 text-[#e9f8ff] hover:border-[#5bddff]/52 hover:bg-[#1f4368]"
                }`}
              >
                Login/Sign Up
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
                  : isAdmin
                  ? "border-[#4ade80]/22 bg-[#052e16]/50 text-[#4ade80] hover:bg-[#052e16]"
                  : "border-[#f6c748]/36 bg-[#43330e]/72 text-[#ffe7a6] hover:border-[#ffd770]/50 hover:bg-[#574313]"
              }`}
            >
              Admin
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
              : "bg-[#020711]/82"
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
              : "border-[#35d7ff]/20 bg-[linear-gradient(180deg,#14253f_0%,#0a1325_70%,#070f1f_100%)]"
          } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b pb-5">
            <div>
              <p className={`text-sm font-bold uppercase tracking-[0.28em] ${
                isTbc ? "text-[#a8ff9f]" : isMidnight ? "text-[#7fd4ff]" : isAdmin ? "text-[#4ade80]" : "text-[#69deff]"
              }`}>
                Games
              </p>
              <h2 className={`font-throne mt-3 text-4xl ${
                isTbc ? "text-[#d4ffcc]" : isMidnight ? "text-[#b8e0ff]" : isAdmin ? "text-[#86efac]" : "text-[#e8f8ff]"
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
                  : isAdmin
                  ? "border-[#4ade80]/20 bg-[#4ade80]/8 hover:bg-[#4ade80]/12 hover:border-[#4ade80]/30"
                  : "border-[#36d8ff]/22 bg-[#36d8ff]/10 text-[#d8f4ff] hover:border-[#67e2ff]/34 hover:bg-[#36d8ff]/16"
              }`}
            >
              Close
            </button>
          </div>

          <div className={`mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.26em] ${
            isTbc ? "text-[#b8e6b8]" : isMidnight ? "text-[#a8d0ff]" : isAdmin ? "text-[#22c55e]" : "text-[#9ab8de]"
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
                      : isAdmin
                      ? "border-[#4ade80]/30 bg-[#4ade80]/12 text-[#86efac]"
                      : "border-[#35d8ff]/34 bg-[#35d8ff]/14 text-[#e2f7ff]"
                    : isTbc
                    ? "border-[#a8ff9f]/12 text-[#b8e6b8] hover:border-[#a8ff9f]/24"
                    : isMidnight
                    ? "border-[#4dc6ff]/14 text-[#a8d8ff] hover:border-[#4dc6ff]/28"
                    : isAdmin
                    ? "border-[#4ade80]/12 text-[#4ade80] hover:border-[#4ade80]/28"
                    : "border-[#35d8ff]/14 text-[#9ebada] hover:border-[#35d8ff]/30 hover:text-[#dcf5ff]"
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
                      : isAdmin
                      ? "border-[#4ade80]/18 hover:border-[#4ade80]/35 hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                        : "border-[#35d8ff]/16 bg-[linear-gradient(120deg,rgba(10,23,42,0.76),rgba(13,30,54,0.62))] hover:border-[#35d8ff]/35 hover:shadow-[0_0_20px_rgba(53,216,255,0.22)]"
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
                            : isAdmin
                            ? "border-[#4ade80]/28 bg-[#4ade80]/14 text-[#86efac]"
                            : "border-[#f4c241]/35 bg-[#f4c241]/16 text-[#ffe8a8]"
                        }`}>
                          Hot
                        </span>
                      ) : null}
                      <p className={`text-base font-black transition-colors ${
                        isTbc
                          ? "text-[#d4ffcc] group-hover:text-[#e8ffeb]"
                          : isMidnight
                          ? "text-[#c7e7ff] group-hover:text-[#f0f9ff]"
                          : isAdmin
                          ? "text-[#4ade80] group-hover:text-[#86efac]"
                            : "text-[#e2f5ff] group-hover:text-[#f4fbff]"
                      }`}>
                        {game.title}
                      </p>
                    </div>
                    <p className={`mt-1 text-xs ${
                        isTbc ? "text-[#a8d0a8]" : isMidnight ? "text-[#9dc4ea]" : isAdmin ? "text-[#22c55e]" : "text-[#93b3d8]"
                    }`}>
                      {game.shortTitle}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
                    isTbc
                      ? "border-[#a8ff9f]/30 bg-[#a8ff9f]/20 text-[#e0ffe0] group-hover:border-[#a8ff9f]/50 group-hover:shadow-[0_0_12px_rgba(168,255,159,0.3)]"
                      : isMidnight
                      ? "border-[#4dc6ff]/30 bg-[#4dc6ff]/18 text-[#dff3ff] group-hover:border-[#7fd4ff]/55 group-hover:shadow-[0_0_12px_rgba(77,198,255,0.35)]"
                      : isAdmin
                      ? "border-[#4ade80]/28 bg-[#4ade80]/14 text-[#86efac] group-hover:border-[#4ade80]/55 group-hover:shadow-[0_0_12px_rgba(74,222,128,0.3)]"
                      : "border-[#36d8ff]/34 bg-[#36d8ff]/14 text-[#dff7ff] group-hover:border-[#67e2ff]/55 group-hover:shadow-[0_0_12px_rgba(54,216,255,0.38)]"
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
