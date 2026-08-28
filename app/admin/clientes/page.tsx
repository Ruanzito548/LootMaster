import Link from "next/link";

const sections = [
  {
    id: "01",
    title: "Todos os clientes",
    description: "Vincule clientes a partners, promova clientes a partners e gerencie desvinculos.",
    href: "/admin/clientes/todos",
  },
  {
    id: "02",
    title: "Partners",
    description: "Visualize todos os partners ativos e ajuste a porcentagem da taxa de cada partner.",
    href: "/admin/clientes/agentes",
  },
];

export default function AdminClientesPage() {
  return (
    <div className="min-h-screen text-green-400">
      <main className="w-full px-1 py-4 sm:px-2 lg:px-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d4af5a]">Admin / Clientes</p>
            <h1 className="mt-2 text-3xl font-black text-[#f0ede4] sm:text-4xl">Clientes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#8e98a3]">
              Gerencie e acompanhe todos os clientes cadastrados na plataforma.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/clientes" className="inline-flex items-center rounded-lg border border-white/10 bg-[#101722] px-4 py-2 text-sm font-bold text-[#a8b3c1] transition hover:bg-[#171d28] hover:text-[#e6c46a]">
              Voltar para clientes
            </Link>
            <Link href="/admin" className="inline-flex items-center rounded-lg border border-[#d4af5a]/35 bg-[#d4af5a] px-4 py-2 text-sm font-bold text-[#17120a] transition hover:bg-[#e6c46a]">
              Back to admin
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="rounded-[1.75rem] border border-green-900 bg-green-950/20 p-7 transition-all hover:-translate-y-0.5 hover:border-green-700/50 hover:bg-green-950/40"
            >
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Bloco {section.id}</p>
              <h2 className="mt-3 text-3xl font-black text-green-300">{section.title}</h2>
              <p className="mt-3 text-base leading-8 text-green-600">{section.description}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-green-500">Abrir</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
