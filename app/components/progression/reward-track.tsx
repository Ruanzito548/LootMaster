import { type RewardTrackNode } from "../../../lib/level-rewards";

const rarityStyles: Record<string, { dot: string; border: string; glow: string; text: string }> = {
  common: {
    dot: "bg-[#9ca3af]",
    border: "border-[#9ca3af]/45",
    glow: "shadow-[0_0_16px_rgba(156,163,175,0.22)]",
    text: "text-[#d2d6de]",
  },
  rare: {
    dot: "bg-[#3b82f6]",
    border: "border-[#3b82f6]/50",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.28)]",
    text: "text-[#8fc1ff]",
  },
  epic: {
    dot: "bg-[#8b5cf6]",
    border: "border-[#8b5cf6]/50",
    glow: "shadow-[0_0_18px_rgba(139,92,246,0.3)]",
    text: "text-[#d8a8ff]",
  },
  legendary: {
    dot: "bg-[#f59e0b]",
    border: "border-[#f59e0b]/50",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.3)]",
    text: "text-[#ffc08f]",
  },
  mythic: {
    dot: "bg-[#ef4444]",
    border: "border-[#ef4444]/55",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.34)]",
    text: "text-[#ff9d9d]",
  },
};

type RewardTrackProps = {
  nodes: RewardTrackNode[];
};

export function RewardTrack({ nodes }: RewardTrackProps) {
  return (
    <div className="w-full max-w-full overflow-hidden pb-3">
      <div className="w-full max-w-full overflow-x-auto overflow-y-visible pb-2">
        <div className="relative inline-flex min-w-max items-start gap-4 px-2">
          <div className="theme-progress-track pointer-events-none absolute left-8 right-8 top-16 h-[5px] rounded-full" />
          {nodes.map((node) => {
            const styles = rarityStyles[node.reward.rarity] ?? rarityStyles.common;
            const isClaimed = node.state === "claimed";
            const isCurrent = node.state === "current";
            const isLocked = node.state === "locked";

            return (
              <article
                key={`track-${node.level}`}
                className={`group relative flex w-[236px] shrink-0 flex-col items-center gap-3 ${node.isMilestone ? "pt-0" : "pt-1"}`}
              >
                <div
                  className={`z-10 rounded-full border-2 ${styles.border} ${styles.dot} ${styles.glow} ${
                    node.isMilestone ? "h-8 w-8" : "h-6 w-6"
                  } ${isCurrent ? "ring-4 ring-[color:var(--accent)]" : ""} ${isLocked ? "opacity-55" : "opacity-95"}`}
                />

                <div
                  className={`theme-surface-soft w-full rounded-2xl border-2 p-4 transition-all duration-300 ${styles.border} ${
                    isCurrent ? "reward-node-current" : ""
                  } ${
                    isClaimed
                      ? "opacity-75"
                      : isLocked
                      ? "opacity-68"
                      : "opacity-100"
                  } ${node.isMilestone ? "min-h-[196px]" : "min-h-[184px]"} hover:-translate-y-1.5 hover:opacity-100`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl leading-none">{node.reward.icon}</span>
                    <span className={`text-[0.62rem] font-bold uppercase tracking-[0.14em] ${styles.text}`}>
                      {node.reward.badge}
                    </span>
                  </div>

                  <p className="mt-3 truncate text-xs font-black uppercase tracking-[0.14em] text-[color:var(--text-main)]">
                    Lvl {node.level}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-[color:var(--text-muted)]">{node.reward.shortLabel}</p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] ${
                        isClaimed
                          ? "theme-status-claimed"
                          : isCurrent
                          ? "theme-status-current"
                          : "theme-status-locked"
                      }`}
                    >
                      {isClaimed ? "claimed" : isCurrent ? "current" : "locked"}
                    </span>
                    {node.isPremium || node.isMilestone ? (
                      <span className="rounded-full bg-[#ef4444]/20 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#ff9f9f]">
                        {node.isPremium ? "premium" : "milestone"}
                      </span>
                    ) : null}
                  </div>
                </div>

                {isCurrent ? (
                  <span className="pointer-events-none absolute -top-1 right-3 rounded-full bg-[color:var(--accent)]/18 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[color:var(--accent)]">
                    You are here
                  </span>
                ) : null}

                <div className="pointer-events-none absolute -top-2 left-1/2 z-20 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10141c]/96 p-3 text-left opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Level {node.level}</p>
                  <p className="mt-1 text-xs font-black text-[color:var(--text-main)]">{node.reward.title}</p>
                  <p className="mt-1 text-[0.68rem] leading-5 text-[color:var(--text-muted)]">{node.reward.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
