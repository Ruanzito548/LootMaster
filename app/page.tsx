import { Navbar } from "./components/navbar";

const features = [
  "Distribuicao de loot mais clara para a raid",
  "Historico rapido para evitar discussao desnecessaria",
  "Painel simples para organizar prioridade e regras",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf7_0%,#f5efe2_45%,#ece3cf_100%)] text-zinc-950">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-10 lg:px-8">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-amber-900/20 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-900">
              Raid Management
            </span>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-tight sm:text-6xl">
                Uma navbar bonita pra abrir seu Loot Master com cara de produto.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-700">
                Estruture sua guilda, destaque os atalhos principais e deixe a
                home pronta para receber as proximas secoes do projeto.
              </p>
            </div>

            <div id="cta" className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#como-funciona"
                className="rounded-full bg-zinc-950 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Ver estrutura
              </a>
              <a
                href="#beneficios"
                className="rounded-full border border-zinc-950/15 bg-white/70 px-6 py-3 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
              >
                Explorar beneficios
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-zinc-950 p-6 text-white shadow-[0_24px_80px_rgba(33,24,7,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.35),transparent_38%)]" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
                  Dashboard
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Online
                </span>
              </div>

              <div className="rounded-[1.5rem] bg-white/8 p-5 ring-1 ring-white/10">
                <p className="text-sm text-zinc-300">Raid de hoje</p>
                <p className="mt-2 text-3xl font-black">Icecrown Citadel</p>
                <p className="mt-3 text-sm text-zinc-300">
                  25 jogadores confirmados, prioridades sincronizadas e loot
                  pronto para distribuicao.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["DKP", "Prioridade", "Logs"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-5 text-center text-sm font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="grid gap-6 rounded-[2rem] border border-black/10 bg-white/70 p-8 shadow-sm lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <article key={feature} className="space-y-3 rounded-3xl bg-white p-6">
              <span className="text-sm font-bold text-amber-800">
                0{index + 1}
              </span>
              <h2 className="text-xl font-bold">{feature}</h2>
              <p className="text-sm leading-7 text-zinc-600">
                Base pronta para virar landing page, dashboard ou portal da sua
                guilda sem precisar refazer o topo depois.
              </p>
            </article>
          ))}
        </section>

        <section
          id="beneficios"
          className="grid gap-6 py-16 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="space-y-4">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-900">
              Beneficios
            </p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              A navbar ja organiza a navegacao e deixa o projeto com direcao.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Header sticky com blur",
              "Links centrais para secoes",
              "CTA destacado no canto direito",
              "Visual responsivo para desktop e mobile",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 text-sm font-medium text-zinc-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section
          id="faq"
          className="rounded-[2rem] border border-black/10 bg-zinc-950 px-8 py-10 text-white"
        >
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-300">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-black">Quer expandir depois?</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-300">
            Essa estrutura aceita logo com icone, menu mobile, rotas reais,
            estado ativo e integracao com autenticacao quando voce quiser.
          </p>
        </section>
      </main>
    </div>
  );
}
