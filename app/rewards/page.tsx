import Link from "next/link";

import { buildLevelReward, calculateLevelProgress, formatMoneyUsd } from "../../lib/level-rewards";

const roadmapLevels = [2, 3, 4, 5, 6, 7, 8, 9];

export default function RewardsPage() {
  const progress = calculateLevelProgress(0);

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">Rewards</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Level rewards roadmap</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Every $250 spent unlocks the next level. Rewards are granted directly to the inventory as chests, keys, or discount coupons.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[1.75rem] border border-[#ffffff12] bg-[#09111f]/80 p-6">
              <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Progress rule</p>
              <h2 className="loot-title mt-4 text-3xl font-black">1 level for every $250</h2>
              <p className="loot-muted mt-4 text-base leading-7">
                Level 2 starts at ${formatMoneyUsd(250)} spent. The bar fills with real purchase value and the reward is deposited automatically when the threshold is crossed.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Current level</p>
                  <p className="mt-2 text-3xl font-black text-[#8dd0ff]">{progress.level}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Level XP</p>
                  <p className="mt-2 text-3xl font-black text-[#ffcf57]">$250</p>
                </div>
                <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Next reward</p>
                  <p className="mt-2 text-lg font-black text-[#dff7ff]">{buildLevelReward(progress.nextLevel).title}</p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-[#ffffff12] bg-[#09111f]/80 p-6">
              <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Reward types</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-lg font-black text-[#ffcf57]">Chest</p>
                  <p className="loot-muted mt-2 text-sm leading-6">Openable vault reward with collectible value.</p>
                </div>
                <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-lg font-black text-[#8dd0ff]">Key</p>
                  <p className="loot-muted mt-2 text-sm leading-6">Used to open chests and special loot pulls.</p>
                </div>
                <div className="rounded-[1.25rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-lg font-black text-[#a9ffcb]">Coupon</p>
                  <p className="loot-muted mt-2 text-sm leading-6">Discount coupons are stored in inventory and can be redeemed later.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {roadmapLevels.map((level) => {
            const reward = buildLevelReward(level, `roadmap-${level}`);
            const spendRequired = (level - 1) * 250;

            return (
              <article key={level} className="loot-panel rounded-[1.65rem] p-6 transition-transform hover:-translate-y-1">
                <p className="loot-kicker text-xs uppercase tracking-[0.24em] text-[#9fb8db]">Level {level}</p>
                <h2 className="loot-title mt-3 text-2xl font-black">{reward.title}</h2>
                <p className="loot-muted mt-3 text-sm leading-6">{reward.description}</p>
                <div className="mt-5 rounded-[1.1rem] border border-[#ffffff12] bg-[#06121d]/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fb8db]">Unlock at</p>
                  <p className="mt-2 text-2xl font-black text-[#ffcf57]">${formatMoneyUsd(spendRequired)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[#ffffff12] bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#dff7ff]">
                    {reward.badge}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dd0ff]">Inventory grant</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <Link
            href="/rewards/roulette"
            className="loot-panel rounded-[1.75rem] p-8 transition-transform hover:-translate-y-1"
          >
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#ffc94d]">Roulette</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Spin to win</h2>
            <p className="loot-muted mt-4 text-base leading-7">Use your tickets to test your luck and win more inventory rewards.</p>
          </Link>

          <Link
            href="/rewards/chests"
            className="loot-panel rounded-[1.75rem] p-8 transition-transform hover:-translate-y-1"
          >
            <p className="loot-kicker text-sm uppercase tracking-[0.24em] text-[#8dd0ff]">Chests</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Open chests</h2>
            <p className="loot-muted mt-4 text-base leading-7">Choose a chest and unlock instant rewards and exclusive bonuses.</p>
          </Link>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to profile
          </Link>
          <Link href="/profile/inventory" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            View inventory
          </Link>
        </div>
      </main>
    </div>
  );
}