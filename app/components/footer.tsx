"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="theme-transition-surface theme-footer-shell relative mt-auto border-t border-[color:var(--border-color)] bg-[color:var(--footer-bg)] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--primary) 70%, transparent) 35%, color-mix(in srgb, var(--accent) 70%, transparent) 70%, transparent 100%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3 text-[color:var(--text-main)]">
              <Image src="/lootmasterlogo.png" alt="Loot Master Logo" width={56} height={56} className="h-14 w-auto" />
              <span className="font-throne text-2xl">Loot Master</span>
            </Link>
            <p className="text-sm leading-7 text-[color:var(--text-muted)]">
              Your premium game marketplace for gold, accounts and progression services with immersive theme-based navigation.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--accent)]">Navigation</h3>
            <nav className="flex flex-col gap-2 text-sm text-[color:var(--text-muted)]">
              <Link href="/" className="theme-footer-link">Home</Link>
              <Link href="/games" className="theme-footer-link">Games</Link>
              <Link href="/rewards" className="theme-footer-link">Rewards</Link>
              <Link href="/profile" className="theme-footer-link">Profile</Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--accent)]">Support</h3>
            <nav className="flex flex-col gap-2 text-sm text-[color:var(--text-muted)]">
              <a href="mailto:support@lootmaster.com" className="theme-footer-link">Contact</a>
              <a href="#faq" className="theme-footer-link">FAQ</a>
              <a href="#terms" className="theme-footer-link">Terms</a>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-[color:var(--accent)]">Community</h3>
            <div className="flex gap-3">
              <a href="#discord" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-[11px] px-3 py-2 text-sm font-semibold">
                Discord
              </a>
              <a href="#twitter" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-[11px] px-3 py-2 text-sm font-semibold">
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className="theme-divider" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-[color:var(--text-muted)] md:flex-row md:gap-0">
          <p>&copy; {currentYear} Loot Master. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="theme-footer-link">Privacy</a>
            <a href="#cookies" className="theme-footer-link">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
