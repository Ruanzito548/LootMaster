import Link from "next/link";

const links = [
  { href: "#hots", label: "Hots" },
  { href: "#games", label: "Games" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#070b14]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link
          href="/"
          className="text-lg font-black uppercase tracking-[0.28em] text-white"
        >
          Loot Master
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 md:inline-flex"
          >
            Admin
          </Link>
          <Link
            href="#games"
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
          >
            Escolher jogo
          </Link>
        </div>
      </div>
    </header>
  );
}
