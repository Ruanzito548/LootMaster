import { type LevelProgress, formatMoneyUsd } from "../../../lib/level-rewards";

type MainStatsGridProps = {
  progress: LevelProgress;
  lootCoins: number;
  rewardsUnlocked: number;
};

export function MainStatsGrid({ progress, lootCoins, rewardsUnlocked }: MainStatsGridProps) {
  const cards = [
    { label: "Level", value: String(progress.level), tone: "text-[#8dd0ff]" },
    { label: "Current XP", value: progress.xpCents.toFixed(2), tone: "text-[#dff7ff]" },
    { label: "Total Spent", value: `$${formatMoneyUsd(progress.totalSpentUsd)}`, tone: "text-[#ffcf57]" },
    { label: "Loot Coins", value: lootCoins.toLocaleString("pt-BR"), tone: "text-[#88ffd5]" },
    { label: "Rewards Unlocked", value: String(rewardsUnlocked), tone: "text-[#f6a7ff]" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="loot-panel rounded-2xl px-4 py-5">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#9db3d3]">{card.label}</p>
          <p className={`mt-3 text-2xl font-black ${card.tone}`}>{card.value}</p>
        </article>
      ))}
    </section>
  );
}
