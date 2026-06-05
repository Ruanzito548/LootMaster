"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, useState } from "react";
import {
  Bell,
  Crown,
  Gamepad2,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Shield,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import { useProfileSession } from "../profile/use-profile-session";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/profile/inventory", label: "Inventory", icon: Package },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/admin", label: "Admin", icon: Shield },
];

const profileItems: NavItem[] = [
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/profile/inventory", label: "Inventory", icon: Package },
  { href: "/profile/history", label: "Orders", icon: LayoutDashboard },
  { href: "/profile/wallet-history", label: "Settings", icon: Wallet },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const { profile, status, signOutUser } = useProfileSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const avatar = profile?.photoURL || "/lootmasterlogo.png";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(9,15,30,0.74)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(59,168,255,0.08)_0%,rgba(59,168,255,0.7)_36%,rgba(124,77,255,0.65)_70%,rgba(124,77,255,0.08)_100%)]" />

      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="gm-button gm-button-secondary inline-flex items-center justify-center rounded-xl px-3 py-2 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="gm-glass inline-flex items-center gap-2 rounded-xl px-3 py-2">
            <Image src="/lootmasterlogo.png" alt="Loot Master" width={34} height={34} className="h-8 w-8 rounded-md" />
            <div className="hidden sm:block">
              <p className="font-throne text-lg font-black leading-none text-[#e9f6ff]">Loot Master</p>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#8cb4df]">Gaming Market</p>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`gm-button inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
                  active
                    ? "border-[#6ee7ff]/40 bg-[#3ba8ff]/16 text-[#dff6ff] shadow-[0_0_20px_rgba(59,168,255,0.25)]"
                    : "border-transparent text-[#9cb8dc] hover:border-white/15 hover:bg-white/5 hover:text-[#dcf1ff]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="gm-glass hidden items-center gap-2 rounded-xl px-3 py-2 sm:flex">
            <Crown className="h-4 w-4 text-[#facc15]" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#e9f6ff]">
              {profile ? `${profile.lootCoins.toLocaleString("pt-BR")} LC` : "0 LC"}
            </span>
          </div>

          <Link
            href="/rewards"
            className="gm-button gm-button-secondary inline-flex items-center justify-center rounded-xl p-2.5"
            aria-label="Rewards"
          >
            <Gift className="h-4 w-4 text-[#6ee7ff]" />
          </Link>

          <button type="button" className="gm-button gm-button-secondary inline-flex items-center justify-center rounded-xl p-2.5" aria-label="Notifications">
            <Bell className="h-4 w-4 text-[#9dc6f7]" />
          </button>

          {status === "authenticated" && profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="gm-glass gm-button inline-flex items-center gap-2 rounded-xl px-2.5 py-2"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="Avatar" className="h-8 w-8 rounded-lg border border-white/20 object-cover" />
                  <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-[#091020] bg-[#22c55e]" />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#dff2ff]">{profile.username}</p>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#88b6e8]">Lvl {profile.level}</p>
                </div>
              </button>

              {isProfileOpen ? (
                <div className="gm-glass absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-white/12 p-2">
                  {profileItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsProfileOpen(false)}
                        className="gm-button inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b8cff0] hover:bg-white/6 hover:text-[#e8f5ff]"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <div className="gm-divider my-2" />

                  <button
                    type="button"
                    onClick={() => void signOutUser()}
                    className="gm-button inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ffb5b5] hover:bg-[#ef4444]/12"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/login" className="gm-button gm-button-primary gm-shine inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase">
              <UserRound className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      <div className={`fixed inset-0 z-[70] transition ${isMobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-[#030814]/75 backdrop-blur-sm transition-opacity ${isMobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        />

        <aside
          className={`gm-glass absolute left-0 top-0 h-full w-full max-w-xs border-r border-white/12 p-4 transition-transform duration-300 ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#dff2ff]">Navigation</p>
            <button type="button" onClick={() => setIsMobileOpen(false)} className="gm-button gm-button-secondary rounded-lg p-2">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`gm-button inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] ${
                    active ? "bg-[#3ba8ff]/20 text-[#dff6ff]" : "text-[#aac6e8] hover:bg-white/6"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </header>
  );
}
