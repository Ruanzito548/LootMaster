import Image from "next/image";

import { type RewardTrackNode } from "../../../lib/level-rewards";

const rarityStyles: Record<string, { dot: string; border: string; glow: string; text: string }> = {
  common: {
    dot: "bg-[#b8c0c8]",
    border: "border-[#b8c0c8]/45",
    glow: "shadow-[0_0_16px_rgba(184,192,200,0.22)]",
    text: "text-[#e2e6ea]",
  },
  uncommon: {
    dot: "bg-[#2fa36b]",
    border: "border-[#2fa36b]/50",
    glow: "shadow-[0_0_18px_rgba(47,163,107,0.3)]",
    text: "text-[#8fe0b8]",
  },
  rare: {
    dot: "bg-[#2d6ec7]",
    border: "border-[#2d6ec7]/50",
    glow: "shadow-[0_0_18px_rgba(45,110,199,0.28)]",
    text: "text-[#8fc1ff]",
  },
  epic: {
    dot: "bg-[#7a3fa8]",
    border: "border-[#7a3fa8]/50",
    glow: "shadow-[0_0_18px_rgba(122,63,168,0.3)]",
    text: "text-[#d8a8ff]",
  },
  legendary: {
    dot: "bg-[#d4af5a]",
    border: "border-[#d4af5a]/50",
    glow: "shadow-[0_0_18px_rgba(212,175,90,0.3)]",
    text: "text-[#f2d27a]",
  },
  mythic: {
    dot: "bg-[#a33a3a]",
    border: "border-[#a33a3a]/55",
    glow: "shadow-[0_0_20px_rgba(163,58,58,0.34)]",
    text: "text-[#e6c46a]",
  },
};

type RewardTrackProps = {
  nodes: RewardTrackNode[];
};

export function RewardTrack({ nodes }: RewardTrackProps) {
  const squareTintByRarity: Record<string, string> = {
    common: "bg-[#b8c0c8]/18",
    uncommon: "bg-[#2fa36b]/16",
    rare: "bg-[#2d6ec7]/16",
    epic: "bg-[#7a3fa8]/16",
    legendary: "bg-[#d4af5a]/16",
    mythic: "bg-[#a33a3a]/16",
  };

  return (
    <div className="w-full max-w-full overflow-hidden pb-3">
      <div className="w-full max-w-full overflow-x-auto overflow-y-visible pb-2">
        <div className="relative inline-flex min-w-max items-start gap-5 px-3 pt-2">
          {nodes.map((node) => {
            const styles = rarityStyles[node.reward.rarity] ?? rarityStyles.common;
            const isClaimed = node.state === "claimed";
            const isAvailable = node.state === "available";
            const isLocked = node.state === "locked";
            const chestEntries = Object.entries(node.reward.chestBundle ?? {}).filter(([, qty]) => (qty ?? 0) > 0);

            return (
              <article
                key={`track-${node.level}`}
                className={`group relative flex w-[236px] shrink-0 flex-col items-center gap-3 ${node.isMilestone ? "pt-0" : "pt-1"}`}
              >
                <div
                  className={`z-10 rounded-full border-2 ${styles.border} ${styles.dot} ${styles.glow} ${
                    node.isMilestone ? "h-8 w-8" : "h-6 w-6"
                  } ${isAvailable ? "ring-4 ring-[#d4af5a]/65" : ""} ${isLocked ? "opacity-45 grayscale" : "opacity-100"}`}
                />

                <div
                  className={`w-full rounded-2xl border-2 p-4 transition-all duration-300 ${styles.border} ${
                    isAvailable ? "reward-node-current" : ""
                  } ${
                    isClaimed
                      ? "opacity-85"
                      : isLocked
                      ? "opacity-62"
                      : "opacity-100"
                  } ${node.isMilestone ? "min-h-[202px]" : "min-h-[188px]"} bg-[linear-gradient(170deg,rgba(12,20,35,0.95),rgba(6,10,22,0.95))] hover:-translate-y-1.5 hover:opacity-100`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {chestEntries.length > 0 ? (
                        chestEntries.map(([chestRarity, qty]) => {
                          const chestStyles = rarityStyles[chestRarity] ?? rarityStyles.common;
                          const squareTint = squareTintByRarity[chestRarity] ?? squareTintByRarity.common;

                          return (
                            <div
                              key={`${node.level}-${chestRarity}`}
                              className={`relative flex h-8 w-8 items-center justify-center rounded-md border ${chestStyles.border} ${squareTint}`}
                              title={`${qty}x ${chestRarity} chest`}
                            >
                              <Image src="/chest.png" alt="Chest" width={22} height={22} className="h-5 w-5 object-contain" />
                              {(qty ?? 0) > 1 ? (
                                <span className="absolute -bottom-1 -right-1 rounded-full border border-black/40 bg-black/80 px-1 text-[0.52rem] font-black text-white">
                                  x{qty}
                                </span>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className={`relative flex h-8 w-8 items-center justify-center rounded-md border ${styles.border} ${squareTintByRarity[node.reward.rarity] ?? squareTintByRarity.common}`}>
                          <Image src="/chest.png" alt="Chest" width={22} height={22} className="h-5 w-5 object-contain" />
                        </div>
                      )}
                    </div>
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
                          : isAvailable
                          ? "theme-status-current"
                          : "theme-status-locked"
                      }`}
                    >
                      {isClaimed ? "claimed" : isAvailable ? "available" : "locked"}
                    </span>
                    {node.isPremium || node.isMilestone ? (
                      <span className="rounded-full bg-[#a33a3a]/20 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#e6c46a]">
                        {node.isPremium ? "premium" : "milestone"}
                      </span>
                    ) : null}
                  </div>
                </div>

                {isAvailable ? (
                  <span className="pointer-events-none absolute -top-1 right-3 rounded-full bg-[color:var(--accent)]/18 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[color:var(--accent)]">
                    next unlock
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
