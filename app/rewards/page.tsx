import Link from "next/link";

export default function RewardsPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Rewards
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Claim your rewards
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Explore roulette, chests, and special rewards for your account.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <Link
            href="/rewards/roulette"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Roulette</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Spin to win</h2>
            <p className="loot-muted mt-4 text-base leading-7">
              Use your tickets to test your luck and win rare items.
            </p>
          </Link>

          <Link
            href="/rewards/chests"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Chests</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Open chests</h2>
            <p className="loot-muted mt-4 text-base leading-7">
              Choose a chest and unlock instant rewards and exclusive bonuses.
            </p>
          </Link>
        </section>

        <div className="mt-12">
          <Link
            href="/"
            className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
