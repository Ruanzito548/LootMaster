import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isTbc = pathname?.includes("tbc-anniversary");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`mt-auto border-t backdrop-blur-xl ${
      isTbc 
        ? "border-[#a8ff9f]/15 bg-[#0a1a0c]/88" 
        : "border-[#ffd76a]/10 bg-[#08111f]/88"
    }`}>
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
              <span className={`font-throne text-2xl ${
                isTbc ? "text-[#d4ffcc]" : "text-[#ffc94d]"
              }`}>Loot Master</span>
            </Link>
            <p className={`text-sm ${
              isTbc ? "text-[#b8e6b8]" : "text-[#cdb991]"
            }`}>
              Seu marketplace com vibe de tesouro para ouro, contas e servicos do
              World of Warcraft.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : "text-[#ffc94d]"
            }`}>
              Navegação
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Home
              </Link>
              <Link href="/games" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Jogos
              </Link>
              <Link href="/coins" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                LM Coins
              </Link>
              <Link href="/rewards" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Brindes
              </Link>
              <Link href="/profile" className={`transition-colors ${
                isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
              }`}>
                Perfil
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : "text-[#ffc94d]"
            }`}>
              Suporte
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <a
                href="mailto:support@lootmaster.com"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
                }`}
              >
                Contato
              </a>
              <a
                href="#faq"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
                }`}
              >
                FAQ
              </a>
              <a
                href="#terms"
                className={`transition-colors ${
                  isTbc ? "text-[#b8e6b8] hover:text-[#d4ffcc]" : "text-[#cdb991] hover:text-[#8dd0ff]"
                }`}
              >
                Termos
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-[0.26em] ${
              isTbc ? "text-[#a8ff9f]" : "text-[#ffc94d]"
            }`}>
              Comunidade
            </h3>
            <div className="flex gap-3">
              <a
                href="#discord"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold text-white transition-colors ${
                  isTbc
                    ? "border-[#a8ff9f]/25 bg-[#1a3a20]/35 hover:bg-[#1a3a20]/50"
                    : "border-[#84d5ff]/18 bg-[#0d3f7a]/30 hover:bg-[#0d3f7a]/50"
                }`}
              >
                Discord
              </a>
              <a
                href="#twitter"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold text-white transition-colors ${
                  isTbc
                    ? "border-[#a8ff9f]/20 bg-[#a8ff9f]/10 hover:bg-[#a8ff9f]/15"
                    : "border-[#ffd76a]/14 bg-[#fff1be]/8 hover:bg-[#fff1be]/12"
                }`}
              >
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className={`h-px bg-gradient-to-r from-transparent ${
          isTbc ? "via-[#a8ff9f]/25" : "via-[#ffd76a]/20"
        } to-transparent`} />

        <div className={`flex flex-col items-center justify-between gap-4 text-xs md:flex-row md:gap-0 ${
          isTbc ? "text-[#b8e6b8]" : "text-[#9c8765]"
        }`}>
          <p>&copy; {currentYear} Loot Master. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#privacy" className={`transition-colors ${
              isTbc ? "hover:text-[#d4ffcc]" : "hover:text-[#dbcaa7]"
            }`}>
              Privacidade
            </a>
            <a href="#cookies" className={`transition-colors ${
              isTbc ? "hover:text-[#d4ffcc]" : "hover:text-[#dbcaa7]"
            }`}>
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
