import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/8 bg-[#070b14]/80 backdrop-blur-xl mt-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="font-throne text-2xl text-white">
              Loot Master
            </Link>
            <p className="text-sm text-slate-400">
              Seu marketplace de ouro do World of Warcraft
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">
              Navegação
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className="text-slate-400 transition-colors hover:text-cyan-300">
                Home
              </Link>
              <Link href="#games" className="text-slate-400 transition-colors hover:text-cyan-300">
                Games
              </Link>
              <Link href="#hots" className="text-slate-400 transition-colors hover:text-cyan-300">
                Hots
              </Link>
            </nav>
          </div>

          {/* Suporte */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">
              Suporte
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <a 
                href="mailto:support@lootmaster.com" 
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                Contato
              </a>
              <a 
                href="#faq" 
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                FAQ
              </a>
              <a 
                href="#terms" 
                className="text-slate-400 transition-colors hover:text-cyan-300"
              >
                Termos
              </a>
            </nav>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">
              Redes Sociais
            </h3>
            <div className="flex gap-3">
              <a 
                href="#discord" 
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Discord
              </a>
              <a 
                href="#twitter" 
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-0 text-xs text-slate-500">
          <p>© {currentYear} Loot Master. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="transition-colors hover:text-slate-300">
              Privacidade
            </a>
            <a href="#cookies" className="transition-colors hover:text-slate-300">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
