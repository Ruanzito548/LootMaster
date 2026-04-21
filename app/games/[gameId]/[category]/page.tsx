import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountsMarket } from "../../../components/accounts-market";
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
  const isTbc = game?.id === "tbc-anniversary";
  const isMidnight = game?.id === "retail";

  if (!game || !selectedCategory) {
    notFound();
  }

  const servers = getServersByGameId(game.id);

  return (
    <div className={isTbc ? "loot-shell tbc-shell" : "loot-shell"}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href={`/games/${game.id}`}
            className={`inline-flex w-fit rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
              isTbc ? "tbc-secondary-button" : "loot-secondary-button"
            }`}
          >
            Back to categories
          </Link>

          <span className="loot-badge-blue inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]">
            {game.tag} / {selectedCategory.title}
          </span>

          <div className="space-y-4">
            <h1 className={`font-throne text-6xl leading-none sm:text-7xl ${isTbc ? "tbc-title" : "loot-title"}`}>
              {isTbc ? "TBC Anniversary Server Selection" : "Choose your server."}
            </h1>
            <p className={`max-w-2xl text-lg leading-8 ${isTbc ? "tbc-muted" : "loot-muted"}`}>
              {isTbc
                ? `Pick a server for your ${selectedCategory.title} order in the TBC Anniversary realm.`
                : `Select a server to continue with your ${selectedCategory.title.toLowerCase()} order.`}
            </p>
          </div>
        </div>

        {category === "gold" ? (
          <section className="mt-12">
            <GoldPurchaseMenu
              gameId={game.id}
              gameTitle={game.title}
              categoryTitle={selectedCategory.title}
              servers={servers}
            />
          </section>
        ) : category === "accounts" ? (
          <section className="mt-12">
            <AccountsMarket
              gameId={game.id}
              gameTitle={game.title}
            />
          </section>
        ) : servers.length > 0 ? (
            <section className="mt-12 grid gap-5 lg:grid-cols-2">
              {servers.map((server) => (
                <article
                  key={server.id}
                  className={`loot-panel rounded-[1.5rem] p-5 ${isTbc ? "tbc-panel" : ""}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className={`text-3xl font-black ${isTbc ? "tbc-title" : "loot-title"}`}>{server.name}</h2>
                      <p className={`mt-2 text-sm ${isTbc ? "tbc-muted" : "loot-muted"}`}>
                        {server.factions.join(" / ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${isTbc ? "tbc-badge" : "loot-badge-blue"}`}>
                      {server.region}
                    </span>
                  </div>
                </article>
              ))}
            </section>
        ) : (
          <section className={`loot-panel mt-12 rounded-[2rem] p-8 ${isTbc ? "tbc-panel" : ""}`}>
            <p className={`text-sm font-bold uppercase tracking-[0.24em] ${isTbc ? "tbc-kicker" : "loot-kicker"}`}>
              Servers
            </p>
            <h2 className={`mt-4 text-3xl font-black ${isTbc ? "tbc-title" : "loot-title"}`}>Server list coming soon.</h2>
            <p className={`mt-4 max-w-2xl text-base leading-8 ${isTbc ? "tbc-muted" : "loot-muted"}`}>
              {isTbc
                ? "This TBC realm doesn’t have server data yet — we can add it soon."
                : "This game does not have server data yet. We can add it next."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
