import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#ffd76a]/10 bg-[#08111f]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3 text-white">
              <Image
                src="/lootmasterlogo.png"
                alt="Loot Master Logo"
                width={56}
                height={56}
                className="h-14 w-auto"
              />
              <span className="font-throne text-2xl text-[#ffc94d]">Loot Master</span>
            </Link>
            <p className="text-sm text-[#cdb991]">
              Seu marketplace com vibe de tesouro para ouro, contas e servicos do
              World of Warcraft.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-[#ffc94d]">
              Informacoes
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]">
                Home
              </Link>
              <Link href="#profile" className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]">
                Perfil
              </Link>
              <Link href="#coins" className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]">
                LM Coins
              </Link>
              <Link href="#games" className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]">
                Games
              </Link>
              <Link href="#hots" className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]">
                Hots
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-[#ffc94d]">
              Site Gold
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <a
                href="#brindes"
                className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]"
              >
                Brindes
              </a>
              <a
                href="mailto:support@lootmaster.com"
                className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]"
              >
                Contato
              </a>
              <a
                href="#faq"
                className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]"
              >
                FAQ
              </a>
              <a
                href="#terms"
                className="text-[#cdb991] transition-colors hover:text-[#8dd0ff]"
              >
                Termos
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-[#ffc94d]">
              Comunidade
            </h3>
            <div className="flex gap-3">
              <a
                href="#discord"
                className="inline-flex items-center gap-2 rounded-full border border-[#84d5ff]/18 bg-[#0d3f7a]/30 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d3f7a]/50"
              >
                Discord
              </a>
              <a
                href="#twitter"
                className="inline-flex items-center gap-2 rounded-full border border-[#ffd76a]/14 bg-[#fff1be]/8 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#fff1be]/12"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[#ffd76a]/20 to-transparent" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-[#9c8765] md:flex-row md:gap-0">
          <p>&copy; {currentYear} Loot Master. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="transition-colors hover:text-[#dbcaa7]">
              Privacidade
            </a>
            <a href="#cookies" className="transition-colors hover:text-[#dbcaa7]">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
