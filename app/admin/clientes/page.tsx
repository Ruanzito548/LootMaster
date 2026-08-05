import Link from "next/link";

const sections = [
  {
    id: "01",
    title: "Todos os clientes",
    description: "Vincule clientes a agentes, promova clientes a agentes e gerencie desvinculos.",
    href: "/admin/clientes/todos",
  },
  {
    id: "02",
    title: "Agentes",
    description: "Visualize todos os agentes ativos e ajuste a porcentagem da taxa de cada agente.",
    href: "/admin/clientes/agentes",
  },
];

export default function AdminClientesPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Clientes</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-green-600">
              Acesse os modulos de clientes e agentes para controlar vinculacao e repasse de taxas.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Back to admin
          </Link>
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
