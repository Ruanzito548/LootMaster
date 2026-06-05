import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Coins, Gift, ShieldCheck, Sparkles, Swords, UserRound } from "lucide-react";

import { getGameById, serviceCategories } from "../../data/games";

const coverByGame: Record<string, string> = {
  "tbc-anniversary": "/wow/wow-tbc/tbc-logo.jpg",
  retail: "/wow/wow-retail/midinight-logo.jpeg",
  "classic-era": "/wow/wow-classic-era/classic-era-logo.jpg",
  "mist-of-pandaria": "/wow/wow-pandaria/pandaria-logo.jpg",
};

const heroOverlayByGame: Record<string, string> = {
  "classic-era": "linear-gradient(180deg,rgba(20,14,10,0.55),rgba(35,20,10,0.72))",
  "tbc-anniversary": "linear-gradient(180deg,rgba(6,20,10,0.52),rgba(7,28,14,0.78))",
  retail: "linear-gradient(180deg,rgba(8,16,32,0.52),rgba(8,18,40,0.78))",
  "mist-of-pandaria": "linear-gradient(180deg,rgba(8,22,18,0.52),rgba(10,30,24,0.76))",
};

const ambientOverlayByGame: Record<string, string> = {
  "classic-era": "radial-gradient(circle at 82% 15%, rgba(200,155,60,0.12), transparent 32%)",
  "tbc-anniversary": "radial-gradient(circle at 82% 15%, rgba(74,222,128,0.18), transparent 32%)",
  retail: "radial-gradient(circle at 82% 15%, rgba(96,165,250,0.2), transparent 32%)",
  "mist-of-pandaria": "radial-gradient(circle at 82% 15%, rgba(16,185,129,0.18), transparent 32%)",
};

const categoryCoverByGame: Record<string, Record<string, string>> = {
  "tbc-anniversary": {
    gold: "/wow/wow-tbc/tbc-gold.jpeg",
    accounts: "/wow/wow-tbc/tbc-accounts.png",
    boost: "/wow/wow-tbc/tbc-boost.png",
  },
  retail: {
    gold: "/wow/wow-retail/midnight-gold.jpeg",
    accounts: "/wow/wow-retail/midnight-accounts.png",
    boost: "/wow/wow-retail/midnight-boost.png",
  },
  "classic-era": {
    gold: "/wow/wow-classic-era/classic-era-gold.png",
    accounts: "/wow/wow-classic-era/classic-era-accounts.png",
    boost: "/wow/wow-classic-era/classic-era-boost.png",
  },
  "mist-of-pandaria": {
    gold: "/wow/wow-pandaria/pandaria-gold.png",
    accounts: "/wow/wow-pandaria/pandaria-accounts.png",
    boost: "/wow/wow-pandaria/pandaria-boost.png",
  },
};

export default async function GamePage(props: PageProps<"/games/[gameId]">) {
  const { gameId } = await props.params;
  const game = getGameById(gameId);

  if (!game) {
    notFound();
  }

  const categoryCover = categoryCoverByGame[game.id] ?? {};
  const categoryIcons = {
    gold: Coins,
    boost: Swords,
    accounts: UserRound,
  } as const;

  return (
    <div className="loot-shell gm-shell">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="gm-glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `${heroOverlayByGame[game.id] ?? heroOverlayByGame.retail}, url('${coverByGame[game.id] ?? coverByGame.retail}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0" style={{ backgroundImage: ambientOverlayByGame[game.id] ?? ambientOverlayByGame.retail }} />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/games" className="gm-button gm-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-[0.14em]">
                Back to launcher
              </Link>
              <span className="gm-badge inline-flex items-center gap-2 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em]">
                <Sparkles className="h-3 w-3" />
                {game.tag}
              </span>
            </div>

            <div className="max-w-3xl space-y-4">
              <h1 className="font-throne text-5xl font-black leading-[0.95] text-[#ecf7ff] sm:text-6xl lg:text-7xl">{game.title}</h1>
              <p className="text-sm leading-7 text-[#b6cde9] sm:text-base">
                Fast access to services and checkout.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="gm-panel rounded-xl px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#90b3de]">Queue</p>
                <p className="mt-1 text-sm font-black text-[#e7f5ff]">Live supply updates</p>
              </article>
              <article className="gm-panel rounded-xl px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#90b3de]">Rewards</p>
                <p className="mt-1 text-sm font-black text-[#e7f5ff]">Battle pass connected</p>
              </article>
              <article className="gm-panel rounded-xl px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#90b3de]">Security</p>
                <p className="mt-1 text-sm font-black text-[#e7f5ff]">Protected checkout</p>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="grid gap-5 md:grid-cols-3">
            {serviceCategories.map((category) => (
              <Link
                key={category.id}
                href={`/games/${game.id}/${category.id}`}
                className="group relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#101a30]"
              >
                <div
                  className="h-72 transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `linear-gradient(180deg,rgba(6,10,20,0.25),rgba(6,10,20,0.86)), url('${categoryCover[category.id] ?? coverByGame[game.id] ?? coverByGame.retail}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="gm-panel rounded-xl px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xl font-black text-[#eaf4ff]">{category.title}</h2>
                      {(() => {
                        const Icon = categoryIcons[category.id];
                        return <Icon className="h-4 w-4 text-[color:var(--theme-accent)]" />;
                      })()}
                    </div>
                    <span className="gm-button gm-button-primary mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[0.62rem] uppercase tracking-[0.14em]">
                      Open {category.title}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <aside className="space-y-4">
            <article className="gm-panel rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#6ee7ff]">
                <Gift className="h-4 w-4" />
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.17em]">Rewards</p>
              </div>
              <p className="mt-3 text-sm text-[#bbd2ec]">Every completed order grants XP and unlocks seasonal inventory items.</p>
              <Link href="/rewards" className="gm-button gm-button-secondary mt-4 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-[0.62rem] uppercase tracking-[0.14em]">
                View pass
              </Link>
            </article>

            <article className="gm-panel rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#86efac]">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.17em]">Safety</p>
              </div>
              <p className="mt-3 text-sm text-[#bbd2ec]">Payment and order data stay protected with server-side verification.</p>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
