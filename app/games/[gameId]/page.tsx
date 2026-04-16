import Link from "next/link";
import { notFound } from "next/navigation";

import { getGameById, serviceCategories } from "../../data/games";

export default async function GamePage(props: PageProps<"/games/[gameId]">) {
  const { gameId } = await props.params;
  const game = getGameById(gameId);
  const isTbc = game?.id === "tbc-anniversary";
  const isMidnight = game?.id === "retail";

  if (!game) {
    notFound();
  }

  return (
    <div className={isTbc ? "loot-shell tbc-shell" : isMidnight ? "loot-shell midnight-shell" : "loot-shell"}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className={`loot-secondary-button inline-flex w-fit rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
              isTbc ? "tbc-secondary-button" : isMidnight ? "midnight-secondary-button" : ""
            }`}
          >
            Back to home
          </Link>

          <span className="loot-badge-blue inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]">
            {game.tag}
          </span>

          <div className="space-y-4">
            <h1 className={`font-throne text-6xl leading-none sm:text-7xl ${isTbc ? "tbc-title" : isMidnight ? "midnight-title" : "loot-title"}`}>
              {game.title}
            </h1>
            <p className={`max-w-2xl text-lg leading-8 ${isTbc ? "tbc-muted" : isMidnight ? "midnight-muted" : "loot-muted"}`}>
              {isTbc
                ? "Welcome to the TBC Anniversary experience — choose your path with green fire style."
                : isMidnight
                ? "Welcome to the Midnight experience — choose your path with blue midnight style."
                : "Choose the service category you want to explore first."}
            </p>
          </div>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          {serviceCategories.map((category) => {
            const isGoldTbc = isTbc && category.id === "gold";
            const isGoldMidnight = isMidnight && category.id === "gold";

            return (
              <Link
                key={category.id}
                href={`/games/${game.id}/${category.id}`}
                className={`group block overflow-hidden rounded-[1.75rem] border transition duration-300 ease-out ${
                  isTbc ? "tbc-panel" : isMidnight ? "midnight-panel" : "loot-panel"
                } ${
                  isGoldTbc
                    ? "border-[#99ff99]/20 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_30px_rgba(157,255,144,0.28)] hover:border-[#9eff99]/40 hover:-translate-y-1 hover:scale-[1.02]"
                    : isGoldMidnight
                    ? "border-[#4dc6ff]/20 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_30px_rgba(77,198,255,0.28)] hover:border-[#4dc6ff]/40 hover:-translate-y-1 hover:scale-[1.02]"
                    : isMidnight
                    ? "border-[#4dc6ff]/20 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_30px_rgba(77,198,255,0.28)] hover:border-[#4dc6ff]/40 hover:-translate-y-1 hover:scale-[1.02]"
                    : "border-transparent hover:shadow-[0_0_20px_rgba(45,178,255,0.18)] hover:-translate-y-1"
                }`}
                style={
                  isGoldTbc
                    ? {
                        backgroundImage:
                          'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/goldtbc.jpeg")',
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : isGoldMidnight
                    ? {
                        backgroundImage:
                          'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/midnightgold.jpeg")',
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : isMidnight
                    ? {
                        backgroundImage:
                          'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/midnightwallpaper.jpeg")',
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <article className="h-full rounded-[1.75rem] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className={`text-3xl font-black transition-colors ${isTbc ? "tbc-title" : isMidnight ? "midnight-title" : "loot-title"}`}>
                        {category.title}
                      </h2>
                      <p className={`mt-4 text-sm leading-7 transition-colors ${isTbc ? "tbc-muted" : isMidnight ? "midnight-muted" : "loot-muted"}`}>
                        {category.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${category.accent} ${isTbc ? "tbc-badge" : isMidnight ? "midnight-badge" : ""} transition-colors ${
                        isGoldTbc ? "border-[#9eff99]/30 bg-[#9eff99]/10 text-[#e8ffeb]" : isGoldMidnight ? "border-[#4dc6ff]/30 bg-[#4dc6ff]/10 text-[#e0f4ff]" : ""
                      }`}
                    >
                      Open
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
