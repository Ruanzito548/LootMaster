import Link from "next/link";

const games = [
  {
    id: "wow",
    title: "World of Warcraft",
    description: "Manage WOW gold settings, accounts, and boosts.",
  },
  {
    id: "albion",
    title: "Albion Online",
    description: "Reserved area for Albion game settings.",
  },
  {
    id: "runescape",
    title: "Runescape",
    description: "Reserved area for Runescape game settings.",
  },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin</p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">Games</h1>
          <p className="max-w-2xl text-base leading-8 text-green-600">
            Choose which game you want to edit.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/admin/games/${game.id}`}
              className="rounded-[1.75rem] border border-green-900 bg-green-950/20 p-8 transition-colors hover:border-green-700/50 hover:bg-green-950/40"
            >
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Game</p>
              <h2 className="mt-4 text-3xl font-black text-green-300">{game.title}</h2>
              <p className="mt-4 text-base leading-8 text-green-600">{game.description}</p>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
          >
            Back to admin
          </Link>
        </div>
      </main>
    </div>
  );
}
