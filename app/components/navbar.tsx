"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  { href: "/profile/history", label: "History", icon: LayoutDashboard },
  { href: "/profile/wallet-history", label: "Wallet", icon: Wallet },
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
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, left: 0 });
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const avatar = profile?.photoURL || "/lootmasterlogo.png";
  const closeProfileMenu = useEffectEvent(() => {
    setIsProfileOpen(false);
  });

  useEffect(() => {
    closeProfileMenu();
  }, [pathname]);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    const updateProfileMenuPosition = () => {
      const buttonRect = profileButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      const menuWidth = 256;
      const viewportPadding = 8;
      const maxLeft = window.innerWidth - menuWidth - viewportPadding;
      const left = Math.max(viewportPadding, Math.min(buttonRect.right - menuWidth, maxLeft));
      const top = buttonRect.bottom + 10;

      setProfileMenuPosition({ top, left });
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const clickedButton = profileButtonRef.current?.contains(target);
      const clickedMenu = profileMenuRef.current?.contains(target);

      if (!clickedButton && !clickedMenu) {
        setIsProfileOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    updateProfileMenuPosition();

    window.addEventListener("resize", updateProfileMenuPosition);
    window.addEventListener("scroll", updateProfileMenuPosition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", updateProfileMenuPosition);
      window.removeEventListener("scroll", updateProfileMenuPosition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isProfileOpen]);

  return (
    <header className="theme-transition-surface theme-navbar-shell fixed inset-x-0 top-0 z-50 border-b border-[color:var(--border-color)] bg-[color:var(--navbar-bg)] backdrop-blur-xl">
      <div className="theme-top-highlight pointer-events-none absolute inset-x-0 top-0 h-[2px]" />

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
              <p className="font-throne text-lg font-black leading-none text-[color:var(--text-main)]">Loot Master</p>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Gaming Market</p>
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
                    ? "theme-nav-active"
                    : "border-transparent text-[color:var(--text-muted)] hover:border-[color:var(--border-color)] hover:bg-white/5 hover:text-[color:var(--text-main)]"
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
            <Crown className="h-4 w-4 text-[color:var(--accent)]" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-main)]">
              {profile ? `${profile.lootCoins.toLocaleString("pt-BR")} LC` : "0 LC"}
            </span>
          </div>

          <Link
            href="/rewards"
            className="gm-button gm-button-secondary inline-flex items-center justify-center rounded-xl p-2.5"
            aria-label="Rewards"
          >
            <Gift className="h-4 w-4 text-[color:var(--accent)]" />
          </Link>

          <button type="button" className="gm-button gm-button-secondary inline-flex items-center justify-center rounded-xl p-2.5" aria-label="Notifications">
            <Bell className="h-4 w-4 text-[color:var(--text-main)]" />
          </button>

          {status === "authenticated" && profile ? (
            <div className="relative">
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="gm-glass gm-button inline-flex items-center gap-2 rounded-xl px-2.5 py-2"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                aria-label="Open profile menu"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="Avatar" className="h-8 w-8 rounded-lg border border-[color:var(--border-color)] object-cover" />
                  <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-[color:var(--navbar-bg)] bg-[color:var(--accent)]" />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-main)]">{profile.username}</p>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">Lvl {profile.level}</p>
                </div>
              </button>

              {isProfileOpen && typeof document !== "undefined"
                ? createPortal(
                    <div
                      ref={profileMenuRef}
                      className="gm-glass fixed z-[140] w-64 rounded-2xl border border-[color:var(--border-color)] p-2"
                      role="menu"
                      style={{ top: profileMenuPosition.top, left: profileMenuPosition.left }}
                    >
                      {profileItems.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="gm-button inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)] hover:bg-white/6 hover:text-[color:var(--text-main)]"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}

                      <div className="gm-divider my-2" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          void signOutUser();
                        }}
                        className="gm-button inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ffb5b5] hover:bg-[color:var(--danger-soft)]"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Logout</span>
                      </button>
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          ) : (
            <Link href="/login" className="gm-button gm-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase">
              <UserRound className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-[70] transition">
          <button
            type="button"
            className="absolute inset-0 bg-[color:var(--surface-overlay)] backdrop-blur-sm transition-opacity opacity-100"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
          />

          <aside className="gm-glass absolute left-0 top-0 h-full w-full max-w-xs border-r border-[color:var(--border-color)] p-4 transition-transform duration-300 translate-x-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--text-main)]">Navigation</p>
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
                      active ? "theme-nav-active" : "text-[color:var(--text-muted)] hover:bg-white/6"
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
      ) : null}
    </header>
  );
}
