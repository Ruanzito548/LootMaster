import Link from "next/link";
import { notFound } from "next/navigation";

import { getGameById, serviceCategories } from "../../data/games";

export default async function GamePage(props: PageProps<"/games/[gameId]">) {
  const { gameId } = await props.params;
  const game = getGameById(gameId);
  const isTbc = game?.id === "tbc-anniversary";

  if (!game) {
    notFound();
  }

  return (
    <div className={isTbc ? "loot-shell tbc-shell" : "loot-shell"}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className={`loot-secondary-button inline-flex w-fit rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
              isTbc ? "tbc-secondary-button" : ""
            }`}
          >
            Back to home
          </Link>

          <span className="loot-badge-blue inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]">
            {game.tag}
          </span>

          <div className="space-y-4">
            <h1 className={`font-throne text-6xl leading-none sm:text-7xl ${isTbc ? "tbc-title" : "loot-title"}`}>
              {game.title}
            </h1>
            <p className={`max-w-2xl text-lg leading-8 ${isTbc ? "tbc-muted" : "loot-muted"}`}>
              {isTbc
                ? "Welcome to the TBC Anniversary experience — choose your path with green fire style."
                : "Choose the service category you want to explore first."}
            </p>
          </div>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          {serviceCategories.map((category) => (
            <article
              key={category.id}
              className={`loot-panel rounded-[1.75rem] p-6 ${isTbc ? "tbc-panel" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className={`text-3xl font-black ${isTbc ? "tbc-title" : "loot-title"}`}>
                    {category.title}
                  </h2>
                  <p className={`mt-4 text-sm leading-7 ${isTbc ? "tbc-muted" : "loot-muted"}`}>
                    {category.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${category.accent} ${isTbc ? "tbc-badge" : ""}`}
                >
                  Open
                </span>
              </div>

              <Link
                href={`/games/${game.id}/${category.id}`}
                className={`mt-10 inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                  isTbc ? "tbc-secondary-button" : "loot-secondary-button"
                }`}
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
