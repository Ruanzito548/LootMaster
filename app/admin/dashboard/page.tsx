import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">
            Admin
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Dashboard
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Future admin tools and controls will live here.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <p className="loot-muted text-sm font-semibold">
            Placeholder page ready for the next admin features.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to admin
          </Link>
          <Link
            href="/"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
