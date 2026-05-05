"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`mt-auto border-t backdrop-blur-xl ${
      isAdmin ? "border-[#4ade80]/20 bg-black/88" : "border-[#6fe4ff]/16 bg-[#070d18]/84"
    }`}>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 lg:px-8">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/4 p-6 shadow-[0_20px_50px_rgba(3,10,22,0.35)]">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src="/lootmasterlogo.png"
                  alt="Loot Master Logo"
                  width={52}
                  height={52}
                  className="h-13 w-auto"
                />
                <span className={`font-throne text-2xl ${isAdmin ? "text-[#86efac]" : "text-[#b8edff]"}`}>Loot Master</span>
              </Link>
              <p className={`mt-4 max-w-lg text-sm leading-7 ${isAdmin ? "text-[#22c55e]" : "text-[#a6bfd4]"}`}>
                Marketplace for gold, accounts and services with a faster flow, cleaner pages and clearer game navigation.
              </p>
            </div>

            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isAdmin ? "text-[#4ade80]" : "text-[#73dfff]"}`}>
                Explore
              </p>
              <nav className="mt-3 flex flex-col gap-2 text-sm">
                <Link href="/" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>Home</Link>
                <Link href="/games" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>Games</Link>
                <Link href="/coins" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>LM Coins</Link>
                <Link href="/rewards" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>Rewards</Link>
              </nav>
            </div>

            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isAdmin ? "text-[#4ade80]" : "text-[#73dfff]"}`}>
                Contact
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <a href="mailto:support@lootmaster.com" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>
                  support@lootmaster.com
                </a>
                <a href="#privacy" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>Privacy</a>
                <a href="#terms" className={`transition-colors ${isAdmin ? "text-[#86efac] hover:text-[#bbf7d0]" : "text-[#cbe7f6] hover:text-[#e9f7ff]"}`}>Terms</a>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex flex-col items-center justify-between gap-3 text-xs md:flex-row ${isAdmin ? "text-[#22c55e]" : "text-[#86a8c1]"}`}>
          <p>&copy; {currentYear} Loot Master. All rights reserved.</p>
          <p>Crafted for fast in-game trading.</p>
        </div>
      </div>
    </footer>
  );
}
