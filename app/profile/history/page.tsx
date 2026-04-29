"use client";

import Link from "next/link";

import { useProfileSession } from "../use-profile-session";

export default function ProfileHistoryPage() {
  const { status, profile } = useProfileSession();
  const typeLabel: Record<string, string> = {
    purchase: "Purchase",
    sale: "Sale",
  };

  if (status === "loading") {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-muted text-sm">Loading history...</p>
          </section>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return (
      <div className="loot-shell">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <section className="loot-panel rounded-[1.75rem] p-8">
            <h1 className="loot-title text-3xl font-black">Login required</h1>
            <p className="loot-muted mt-3 text-sm">Log in to view purchases and sales.</p>
            <Link href="/login" className="loot-gold-button mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold">
              Go to login
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const buyCount = profile.transactions.filter((item) => item.type === "purchase").length;
  const sellCount = profile.transactions.filter((item) => item.type === "sale").length;

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">History</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Latest sales and purchases</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">Track all profile activity in the marketplace.</p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.2em] text-[#8dd0ff]">Purchases</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#8dd0ff]">{buyCount}</h2>
          </article>
          <article className="loot-panel rounded-[1.75rem] p-8">
            <p className="loot-kicker text-sm uppercase tracking-[0.2em] text-[#ffc94d]">Sales</p>
            <h2 className="loot-title mt-4 text-5xl font-black text-[#ffc94d]">{sellCount}</h2>
          </article>
        </section>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="flex flex-col gap-6">
            {profile.transactions.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[#fff1be]/10 bg-[#06121d]/80 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="loot-title text-2xl font-black">{item.title}</h2>
                    <p className="loot-muted mt-2 text-sm">
                      Type: {typeLabel[item.type] || item.type} • Status: {item.status} • {item.createdAtLabel}
                    </p>
                  </div>
                  <p className="text-lg font-black text-[#ffcf57]">{item.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            View inventory
          </Link>
        </div>
      </main>
    </div>
  );
}
