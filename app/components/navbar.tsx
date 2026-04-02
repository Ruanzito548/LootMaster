import Link from "next/link";

const links = [
  { href: "#hots", label: "Hots" },
  { href: "#games", label: "Games" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-[#f6fbfb]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link
          href="/"
          className="text-lg font-black uppercase tracking-[0.28em] text-slate-950"
        >
          Loot Master
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden rounded-full border border-slate-900/10 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-white md:inline-flex"
          >
            Admin
          </Link>
          <Link
            href="#games"
            className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            Escolher jogo
          </Link>
        </div>
      </div>
    </header>
  );
}
