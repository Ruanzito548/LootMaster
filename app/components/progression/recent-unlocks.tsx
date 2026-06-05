import { type UnlockHistoryItem } from "../../../lib/level-rewards";

const rarityTextClass: Record<string, string> = {
  common: "text-[#d2d6de]",
  rare: "text-[#8fc1ff]",
  epic: "text-[#d8a8ff]",
  legendary: "text-[#ffc08f]",
  mythic: "text-[#ff9d9d]",
};

type RecentUnlocksProps = {
  items: UnlockHistoryItem[];
};

export function RecentUnlocks({ items }: RecentUnlocksProps) {
  return (
    <section className="loot-panel rounded-[1.9rem] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="loot-title text-2xl font-black sm:text-3xl">Recent Unlocks</h2>
        <span className="rounded-full bg-[#4dc6ff]/16 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#8dd0ff]">
          latest drops
        </span>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.slice(0, 8).map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/12 bg-[#08111f]/80 px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#dbe9ff]">Lvl {item.level}</p>
                  <p className={`text-[0.65rem] font-bold uppercase tracking-[0.14em] ${rarityTextClass[item.rarity] ?? "text-[#d2d6de]"}`}>
                    {item.rarity}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#b8cbe7]">{item.title}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#08111f]/70 p-6 text-center text-sm text-[#93a8c6]">
          No unlocks yet
        </div>
      )}
    </section>
  );
}
