import Link from "next/link";
import { notFound } from "next/navigation";

import { GoldPurchaseMenu } from "../../../components/gold-purchase-menu";
import {
  getGameById,
  getServersByGameId,
  getServiceCategoryById,
} from "../../../data/games";

export default async function ServerSelectionPage(
  props: PageProps<"/games/[gameId]/[category]">
) {
  const { gameId, category } = await props.params;
  const game = getGameById(gameId);
  const selectedCategory = getServiceCategoryById(category);

  if (!game || !selectedCategory) {
    notFound();
  }

  const servers = getServersByGameId(game.id);

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href={`/games/${game.id}`}
            className="loot-secondary-button inline-flex w-fit rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to categories
          </Link>

          <span className="loot-badge-blue inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]">
            {game.tag} / {selectedCategory.title}
          </span>

          <div className="space-y-4">
            <h1 className="font-throne loot-title text-6xl leading-none sm:text-7xl">
              Choose your server.
            </h1>
            <p className="loot-muted max-w-2xl text-lg leading-8">
              Select a server to continue with your {selectedCategory.title.toLowerCase()} order.
            </p>
          </div>
        </div>

        {servers.length > 0 ? (
          category === "gold" ? (
            <section className="mt-12">
              <GoldPurchaseMenu
                gameId={game.id}
                gameTitle={game.title}
                categoryTitle={selectedCategory.title}
                servers={servers}
              />
            </section>
          ) : (
            <section className="mt-12 grid gap-5 lg:grid-cols-2">
              {servers.map((server) => (
                <article
                  key={server.id}
                  className="loot-panel rounded-[1.5rem] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="loot-title text-3xl font-black">{server.name}</h2>
                      <p className="loot-muted mt-2 text-sm">
                        {server.factions.join(" / ")}
                      </p>
                    </div>
                    <span className="loot-badge-blue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                      {server.region}
                    </span>
                  </div>
                </article>
              ))}
            </section>
          )
        ) : (
          <section className="loot-panel mt-12 rounded-[2rem] p-8">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">
              Servers
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">Server list coming soon.</h2>
            <p className="loot-muted mt-4 max-w-2xl text-base leading-8">
              This game does not have server data yet. We can add it next.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
