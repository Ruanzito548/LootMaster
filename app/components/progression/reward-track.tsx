import { type RewardTrackNode } from "../../../lib/level-rewards";

const rarityStyles: Record<string, { dot: string; border: string; glow: string; text: string }> = {
  common: {
    dot: "bg-[#9ca3af]",
    border: "border-[#9ca3af]/55",
    glow: "shadow-[0_0_18px_rgba(156,163,175,0.35)]",
    text: "text-[#d2d6de]",
  },
  rare: {
    dot: "bg-[#3b82f6]",
    border: "border-[#3b82f6]/55",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.45)]",
    text: "text-[#8fc1ff]",
  },
  epic: {
    dot: "bg-[#a855f7]",
    border: "border-[#a855f7]/55",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.45)]",
    text: "text-[#d8a8ff]",
  },
  legendary: {
    dot: "bg-[#f97316]",
    border: "border-[#f97316]/55",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.45)]",
    text: "text-[#ffc08f]",
  },
  mythic: {
    dot: "bg-[#ef4444]",
    border: "border-[#ef4444]/60",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.52)]",
    text: "text-[#ff9d9d]",
  },
};

type RewardTrackProps = {
  nodes: RewardTrackNode[];
};

export function RewardTrack({ nodes }: RewardTrackProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-[920px] px-2">
        <div className="absolute left-0 right-0 top-12 h-[4px] rounded-full bg-[#1b2f4a]" />
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))` }}>
          {nodes.map((node) => {
            const styles = rarityStyles[node.reward.rarity] ?? rarityStyles.common;
            const isClaimed = node.state === "claimed";
            const isCurrent = node.state === "current";

            return (
              <article key={`track-${node.level}`} className="relative flex flex-col items-center gap-2">
                <div
                  className={`z-10 h-6 w-6 rounded-full border-2 ${styles.border} ${styles.dot} ${styles.glow} ${
                    isCurrent ? "ring-4 ring-[#4dc6ff]/40" : ""
                  } ${isClaimed ? "opacity-100" : "opacity-70"}`}
                />

                <div
                  className={`w-full rounded-2xl border bg-[#08111f]/88 p-3 transition-all duration-300 hover:-translate-y-1 ${styles.border} ${
                    isCurrent ? "reward-node-current" : ""
                  } ${isClaimed ? "border-white/40" : "border-white/10"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg leading-none">{node.reward.icon}</span>
                    <span className={`text-[0.62rem] font-bold uppercase tracking-[0.14em] ${styles.text}`}>
                      {node.reward.badge}
                    </span>
                  </div>

                  <p className="mt-2 truncate text-xs font-black uppercase tracking-[0.14em] text-[#dbe9ff]">
                    Lvl {node.level}
                  </p>

                  <p className="mt-1 line-clamp-2 text-[0.66rem] font-semibold text-[#9db2d3]">{node.reward.shortLabel}</p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] ${
                        isClaimed
                          ? "bg-[#3cffbb]/14 text-[#75ffcf]"
                          : isCurrent
                          ? "bg-[#4dc6ff]/18 text-[#8edbff]"
                          : "bg-white/6 text-[#8ea2c0]"
                      }`}
                    >
                      {isClaimed ? "claimed" : isCurrent ? "current" : "locked"}
                    </span>
                    {node.isPremium ? (
                      <span className="rounded-full bg-[#ef4444]/20 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#ff9f9f]">
                        premium
                      </span>
                    ) : node.isMilestone ? (
                      <span className="rounded-full bg-[#f97316]/20 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#ffc08f]">
                        milestone
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
