import Link from "next/link";

export default function ProfileCoverPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#8dd0ff]">
            Aparência
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Foto de capa e perfil
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Personalize sua presença no site com uma capa nova e um avatar que represente você.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <h2 className="loot-title text-3xl font-black">Sua foto de capa</h2>
          <div className="mt-6 rounded-[1.75rem] border border-[#ffd76a]/10 bg-[#06121d]/80 p-8">
            <p className="loot-muted text-sm leading-7">
              Aqui você pode adicionar ou trocar a imagem de capa para deixar seu perfil mais atraente.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="loot-gold-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Trocar capa
              </button>
              <button className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                Atualizar avatar
              </button>
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Voltar para perfil
          </Link>
          <Link
            href="/profile/inventory"
            className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Ver inventário
          </Link>
        </div>
      </main>
    </div>
  );
}
