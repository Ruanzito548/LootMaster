import { type LevelProgress, formatMoneyUsd } from "../../../lib/level-rewards";

type MainStatsGridProps = {
  progress: LevelProgress;
  lootCoins: number;
  rewardsUnlocked: number;
};

export function MainStatsGrid({ progress, lootCoins, rewardsUnlocked }: MainStatsGridProps) {
  const cards = [
    { label: "Level", value: String(progress.level), tone: "text-[#d4af5a]" },
    { label: "Current XP", value: progress.xpCents.toFixed(2), tone: "text-[#e2e6ea]" },
    { label: "Total Spent", value: `$${formatMoneyUsd(progress.totalSpentUsd)}`, tone: "text-[#e6c46a]" },
    { label: "Loot Coins", value: lootCoins.toLocaleString("en-US"), tone: "text-[#45c982]" },
    { label: "Rewards Unlocked", value: String(rewardsUnlocked), tone: "text-[#b8c0c8]" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="loot-panel rounded-2xl px-4 py-5">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">{card.label}</p>
          <p className={`font-data mt-3 text-2xl font-bold ${card.tone}`}>{card.value}</p>
        </article>
      ))}
    </section>
  );
}
