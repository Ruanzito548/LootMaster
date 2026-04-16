import Link from "next/link";
import Image from "next/image";

import { HotGames } from "./components/hot-games";
import { games, serviceCategories } from "./data/games";

export default function Home() {
  return (
    <div id="home" className="min-h-screen overflow-hidden text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <section className="relative grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="loot-orb animate-treasure-pulse left-[-6rem] top-8 h-36 w-36 bg-[#f7ba2c]/30" />
          <div className="loot-orb animate-treasure-pulse right-8 top-16 h-24 w-24 bg-[#38bdf8]/35" />
          <div className="loot-orb bottom-[-2rem] right-[-2rem] h-32 w-32 bg-[#60a5fa]/20" />

          <div className="space-y-7">
            <span className="inline-flex rounded-full border border-[#ffd76a]/20 bg-[#f7ba2c]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ffc94d]">
              Site Gold
            </span>

            <div className="space-y-4">
              <h1 className="font-throne max-w-4xl text-5xl leading-none text-[#ffcf57] drop-shadow-[0_6px_24px_rgba(247,186,44,0.28)] sm:text-6xl">
                Estrutura pronta para Home, Perfil, Brindes e Grade de Jogos.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[#dbcaa7]">
                A navegacao agora foi organizada para seguir a ideia do mapa:
                home page, destaques, perfil com inventario, area de brindes,
                saldo LM Coins e menu lateral com os jogos que operamos.
              </p>
            </div>

            <div id="fluxo" className="flex flex-wrap gap-3">
              {["Home", "Perfil", "Brindes", "LM Coins", "Jogos"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "border-[#fff1be]/50 bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] text-[#311204]"
                      : "border-[#83d3ff]/15 bg-[#0f2a4e]/35 text-[#c5e9ff]"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="#hots"
                className="loot-gold-button rounded-full px-6 py-3 text-center text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              >
                Ver destaques
              </Link>
              <Link
                href="#profile"
                className="loot-blue-button rounded-full px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#123a72]"
              >
                Abrir estrutura
              </Link>
            </div>
          </div>

          <div className="loot-panel relative overflow-hidden rounded-[2rem] p-6">
            <div className="absolute left-6 top-8 h-20 w-20 rounded-full bg-[#f7ba2c]/20 blur-2xl" />
            <div className="absolute bottom-6 right-6 h-28 w-28 rounded-full bg-[#2db2ff]/20 blur-2xl" />
            <div className="absolute right-[-1rem] top-10 h-28 w-28 rotate-12 rounded-[2rem] border border-[#84d5ff]/25 bg-[linear-gradient(180deg,rgba(95,208,255,0.35),rgba(22,76,167,0.15))] animate-crystal-float" />
            <div className="space-y-5 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-[#ffc94d]/85">
                  Home Page
                </span>
                <span className="rounded-full border border-[#fff1be]/15 bg-[#fff1be]/10 px-3 py-1 text-xs text-[#ffcf57]">
                  Live
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,222,124,0.18),rgba(45,178,255,0.06))] p-5 ring-1 ring-[#fff1be]/10">
                  <p className="text-sm text-[#dbcaa7]">Componentes principais</p>
                  <p className="mt-2 text-3xl text-[#ffcf57]">
                    Navbar, Home, Hots, Jogos e Footer
                  </p>
                </div>

                <div className="relative mx-auto flex max-w-[20rem] items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#f7ba2c]/15 blur-3xl" />
                  <Image
                    src="/lootmasterlogo.png"
                    alt="Loot Master treasure logo"
                    width={460}
                    height={460}
                    priority
                    className="relative z-10 h-auto w-full drop-shadow-[0_18px_42px_rgba(247,186,44,0.24)]"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Perfil", "Brindes", "Coins"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-5 text-center text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                      index === 0
                        ? "border-[#fff1be]/35 bg-[linear-gradient(180deg,rgba(247,186,44,0.24),rgba(204,122,21,0.18))] text-[#fff1be]"
                        : "border-[#84d5ff]/12 bg-[#0c2647]/35 text-[#c5e9ff]"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                {[
                  { label: "Jogos", value: games.length },
                  { label: "Categorias", value: serviceCategories.length },
                  { label: "Menu", value: "Lateral" },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-[#fff1be]/10 bg-black/20 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-[#b6a17b]">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#ffcf57]">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="profile" className="grid gap-5 py-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="loot-panel rounded-[1.8rem] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
              Perfil
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#ffcf57]">
              Perfil com inventario, foto e historico.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#dbcaa7]">
              Essa area espelha a parte do mapa com perfil do usuario, foto de
              capa/perfil, inventario e historico de vendas/compras.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Inventario",
                description:
                  "Saldo em coins, tickets e chaves em um mesmo bloco de acesso rapido.",
              },
              {
                title: "Foto de perfil",
                description:
                  "Espaco para capa e identidade visual da conta do usuario.",
              },
              {
                title: "Historico",
                description:
                  "Area pronta para compras e vendas feitas dentro da plataforma.",
              },
            ].map((step) => (
              <article
                key={step.title}
                className="loot-panel rounded-[1.6rem] p-5"
              >
                <h3 className="text-xl font-black text-[#ffc94d]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#dbcaa7]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="coins" className="py-6">
          <div className="loot-panel rounded-[2rem] p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
                  LM Coins
                </p>
                <h2 className="mt-3 text-4xl font-black leading-tight text-[#ffcf57]">
                  Saldo centralizado com coins, tickets e chaves.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[#dbcaa7]">
                  O saldo LM Coins entra como parte fixa da experiencia principal,
                  ficando visivel e conectado ao inventario do usuario.
                </p>
              </div>

              <div className="grid min-w-[18rem] gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { label: "Saldo em coins", value: "12.450" },
                  { label: "Tickets", value: "18" },
                  { label: "Chaves", value: "7" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.25rem] border border-[#84d5ff]/14 bg-[#0d3f7a]/18 px-5 py-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c7ecff]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#ffcf57]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="brindes" className="py-6">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="loot-panel rounded-[1.8rem] p-6">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
                Brindes
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-[#ffcf57]">
                Roleta e baus como blocos dedicados.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#dbcaa7]">
                A navbar pode levar para uma area de recompensas com roleta,
                baus e outras dinamicas promocionais do ecossistema.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Roleta",
                  description: "Entrada para giros, recompensas rapidas e eventos sazonais.",
                },
                {
                  title: "Baus",
                  description: "Area para abrir premios, chaves e recompensas especiais.",
                },
              ].map((item) => (
                <article key={item.title} className="loot-panel rounded-[1.6rem] p-5">
                  <h3 className="text-2xl font-black text-[#ffc94d]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#dbcaa7]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <HotGames />

        <section id="games" className="py-10">
          <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
                Grade de jogos
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#ffcf57]">
                Blocos dos jogos que operamos.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#cdb991]">
              Cada card funciona como pagina de entrada do jogo e leva para a
              respectiva pagina de venda.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {games.map((game) => (
              <article
                key={game.id}
                className="loot-panel rounded-[1.75rem] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-[#84d5ff]/20 bg-[#0d3f7a]/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#c7ecff]">
                      {game.tag}
                    </span>
                    <h3 className="mt-4 text-3xl font-black leading-tight text-[#ffc94d]">
                      {game.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#fff1be]/12 bg-[#fff1be]/8 px-3 py-1 text-xs font-semibold text-[#e4d0a7]">
                    {game.shortTitle}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-[#dbcaa7]">
                  {game.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {serviceCategories.map((category) => (
                    <span
                      key={`${game.id}-${category.id}`}
                      className="rounded-full border border-[#84d5ff]/15 bg-[#0f2745]/40 px-3 py-1 text-xs font-semibold text-[#c7ecff]"
                    >
                      {category.title}
                    </span>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    href={`/games/${game.id}`}
                    className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                  >
                    Pagina de venda
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className="loot-panel rounded-[2rem] p-8">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#ffc94d]">
              Footer
            </p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-4xl font-black leading-tight text-[#ffcf57]">
                  Informacoes, comunidade e navegacao complementar.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[#dbcaa7]">
                  O rodape fecha a estrutura do site com links institucionais,
                  suporte e comunidade, como no mapa que voce mandou.
                </p>
              </div>
              <Link
                href="#games"
                className="loot-blue-button inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#123a72]"
              >
                Ver jogos
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
