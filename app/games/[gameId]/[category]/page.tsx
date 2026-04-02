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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_42%,#070b14_100%)] text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href={`/games/${game.id}`}
            className="inline-flex w-fit rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to categories
          </Link>

          <span className="inline-flex w-fit rounded-full border border-cyan-300/12 bg-cyan-300/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
            {game.tag} / {selectedCategory.title}
          </span>

          <div className="space-y-4">
            <h1 className="font-throne text-6xl leading-none sm:text-7xl">
              Choose your server.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-400">
              Select a server to continue with your {selectedCategory.title.toLowerCase()} order.
            </p>
          </div>
        </div>

        {servers.length > 0 ? (
          category === "gold" ? (
            <section className="mt-12">
              <GoldPurchaseMenu
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
                  className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,#12192c_0%,#0b1324_100%)] p-5 shadow-[0_24px_80px_rgba(2,8,23,0.28)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-black">{server.name}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {server.factions.join(" / ")}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                      {server.region}
                    </span>
                  </div>
                </article>
              ))}
            </section>
          )
        ) : (
          <section className="mt-12 rounded-[2rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)]">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
              Servers
            </p>
            <h2 className="mt-4 text-3xl font-black">Server list coming soon.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
              This game does not have server data yet. We can add it next.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
