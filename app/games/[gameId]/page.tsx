import Link from "next/link";
import { notFound } from "next/navigation";

import { getGameById, serviceCategories } from "../../data/games";

export default async function GamePage(props: PageProps<"/games/[gameId]">) {
  const { gameId } = await props.params;
  const game = getGameById(gameId);

  if (!game) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_42%,#070b14_100%)] text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex w-fit rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to home
          </Link>

          <span className="inline-flex w-fit rounded-full border border-cyan-300/12 bg-cyan-300/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
            {game.tag}
          </span>

          <div className="space-y-4">
            <h1 className="font-throne text-6xl leading-none sm:text-7xl">
              {game.title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-400">
              Choose the service category you want to explore first.
            </p>
          </div>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          {serviceCategories.map((category) => (
            <article
              key={category.id}
              className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.25)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black">{category.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-400">
                    {category.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${category.accent}`}
                >
                  Open
                </span>
              </div>

              <Link
                href={`/games/${game.id}/${category.id}`}
                className="mt-10 rounded-full bg-white/8 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/12"
              >
                View {category.title}
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
