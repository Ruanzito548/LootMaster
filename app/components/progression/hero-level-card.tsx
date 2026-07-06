import { type LevelProgress } from "../../../lib/level-rewards";

type HeroLevelCardProps = {
  username: string;
  email: string;
  avatarUrl: string;
  coverUrl: string;
  progress: LevelProgress;
};

export function HeroLevelCard({ username, email, avatarUrl, coverUrl, progress }: HeroLevelCardProps) {
  return (
    <section className="loot-panel relative overflow-hidden rounded-[2.1rem]">
      <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${coverUrl})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,11,20,0.16),rgba(6,11,20,0.9)_78%)]" />

      <div className="relative grid gap-5 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Profile avatar"
            className="h-20 w-20 rounded-2xl border border-[color:var(--border-color)] object-cover shadow-[0_12px_30px_var(--shadow-color)]"
          />
          <div>
            <h1 className="loot-title text-3xl font-black leading-none sm:text-4xl">{username}</h1>
            <p className="loot-muted mt-2 text-xs uppercase tracking-[0.18em]">{email || "No email"}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="theme-pill-accent rounded-full px-4 py-2 text-sm font-black">
              Level {progress.level}
            </div>
          </div>

          <div className="theme-progress-track h-4 overflow-hidden rounded-full">
            <div
              className="reward-progress-glow h-full rounded-full"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            <span>{progress.xpCents.toFixed(2)} / {progress.nextLevelXpCents.toFixed(2)} XP</span>
            <span>{progress.progressPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
