import { HotGames } from "./components/hot-games";
import { Navbar } from "./components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_42%,#070b14_100%)] text-white">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <HotGames />

        <section className="grid items-start gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-cyan-300/12 bg-cyan-300/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
              Gamer Marketplace
            </span>

            <div className="space-y-4">
              <h1 className="font-throne max-w-4xl text-5xl leading-none sm:text-6xl">
                Buy gaming accounts, services and currency.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-400">
                Loot Master is a gamer marketplace where players can buy accounts,
                boosting services and in-game currency for different titles in one
                place.
              </p>
            </div>

            <div id="fluxo" className="flex flex-wrap gap-3">
              {["Accounts", "Services", "Currency"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#games"
                className="rounded-full bg-cyan-400 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                Explore games
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#111827_0%,#0f172a_55%,#082f49_100%)] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                  Marketplace
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Live
                </span>
              </div>

              <div className="rounded-[1.5rem] bg-white/8 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">What players can buy</p>
                <p className="mt-2 text-3xl">Accounts, boosts and gold</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Gold", "Boost", "Accounts"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-5 text-center text-sm font-semibold ${
                      index === 0
                        ? "border-cyan-200/50 bg-cyan-200/15 text-cyan-100"
                        : "border-white/10 bg-white/6 text-slate-300"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
