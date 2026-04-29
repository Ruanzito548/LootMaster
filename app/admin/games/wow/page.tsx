import Link from "next/link";

const sections = [
  {
    id: "gold-settings",
    title: "Gold settings",
    description: "Configure price, minimum, and maximum per server and faction.",
  },
  {
    id: "accounts",
    title: "Accounts",
    description: "Area for managing game accounts.",
  },
  {
    id: "boosts",
    title: "Boosts",
    description: "Area for managing game boosts.",
  },
];

export default function WowGamesPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin / Games</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">World of Warcraft</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Choose which game area you want to configure.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/admin/games/wow/${section.id}`}
              className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
            >
              <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">Section</p>
              <h2 className="loot-title mt-4 text-3xl font-black">{section.title}</h2>
              <p className="loot-muted mt-4 text-base leading-8">{section.description}</p>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/admin/games"
            className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to games
          </Link>
        </div>
      </main>
    </div>
  );
}
