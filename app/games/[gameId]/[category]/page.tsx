import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleDollarSign, Package, Server, Swords } from "lucide-react";

import { AccountsMarket } from "../../../components/accounts-market";
import { GoldPurchaseMenu } from "../../../components/gold-purchase-menu";
import { getGameById, getServersByGameId, getServiceCategoryById } from "../../../data/games";

export default async function ServerSelectionPage(props: PageProps<"/games/[gameId]/[category]">) {
  const { gameId, category } = await props.params;
  const game = getGameById(gameId);
  const selectedCategory = getServiceCategoryById(category);

  if (!game || !selectedCategory) {
    notFound();
  }

  const servers = getServersByGameId(game.id);
  const hasServers = servers.length > 0;

  return (
    <div className="loot-shell gm-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="gm-glass rounded-[1.8rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/games/${game.id}`} className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-[0.14em]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to categories
            </Link>
            <span className="gm-badge px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.17em]">{game.tag}</span>
            <span className="gm-badge px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.17em]">{selectedCategory.title}</span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div>
              <h1 className="font-throne text-4xl font-black leading-[0.95] text-[#eaf4ff] sm:text-5xl">
                {selectedCategory.title} Checkout
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#a7c2e0] sm:text-base">
                Configure your order with a cleaner step flow, then proceed to secure payment.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="gm-panel rounded-xl px-3 py-3">
                <div className="flex items-center gap-2 text-[#6ee7ff]"><Server className="h-4 w-4" /><p className="text-[0.56rem] font-bold uppercase tracking-[0.15em]">Server</p></div>
                <p className="mt-2 text-xs text-[#b4cae5]">{hasServers ? `${servers.length} options` : "Not required"}</p>
              </article>
              <article className="gm-panel rounded-xl px-3 py-3">
                <div className="flex items-center gap-2 text-[#facc15]"><CircleDollarSign className="h-4 w-4" /><p className="text-[0.56rem] font-bold uppercase tracking-[0.15em]">Payment</p></div>
                <p className="mt-2 text-xs text-[#b4cae5]">Pix, card or LM Coins</p>
              </article>
              <article className="gm-panel rounded-xl px-3 py-3">
                <div className="flex items-center gap-2 text-[#86efac]"><Swords className="h-4 w-4" /><p className="text-[0.56rem] font-bold uppercase tracking-[0.15em]">Delivery</p></div>
                <p className="mt-2 text-xs text-[#b4cae5]">In-game methods</p>
              </article>
            </div>
          </div>
        </section>

        {category === "gold" ? (
          <section>
            <GoldPurchaseMenu gameId={game.id} gameTitle={game.title} categoryTitle={selectedCategory.title} servers={servers} />
          </section>
        ) : category === "accounts" ? (
          <section className="gm-panel rounded-[1.5rem] p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-[#9dc6f7]"><Package className="h-4 w-4" /><p className="text-[0.6rem] font-bold uppercase tracking-[0.16em]">Account market</p></div>
            <AccountsMarket gameId={game.id} gameTitle={game.title} />
          </section>
        ) : hasServers ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {servers.map((server) => (
              <article key={server.id} className="gm-panel gm-panel-hover rounded-[1.2rem] p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-black text-[#eaf4ff]">{server.name}</h2>
                  <span className="gm-badge px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em]">{server.region}</span>
                </div>
                <p className="mt-3 text-sm text-[#a8c3e0]">Factions: {server.factions.join(" / ")}</p>
              </article>
            ))}
          </section>
        ) : (
          <section className="gm-panel rounded-[1.5rem] p-8 text-center">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.17em] text-[#95b8e2]">Servers</p>
            <h2 className="mt-3 text-2xl font-black text-[#eaf4ff]">Server list coming soon</h2>
            <p className="mt-2 text-sm text-[#a8c3e0]">This category does not require server selection yet.</p>
          </section>
        )}
      </main>
    </div>
  );
}
