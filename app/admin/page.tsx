import Link from "next/link";

const adminSections = [
  {
    id: "01",
    title: "Manage hots",
    description: "Control which games appear in the highlighted section.",
    href: "/admin/manage-hots",
  },
  {
    id: "02",
    title: "Games",
    description: "Choose the game and service type to edit settings.",
    href: "/admin/games",
  },
  {
    id: "03",
    title: "Dashboard",
    description: "Reserved for future tools, controls and admin features.",
    href: "/admin/dashboard",
  },
  {
    id: "04",
    title: "Inventory Items",
    description: "Create item name, WoW rarity, and icon path for inventory slots.",
    href: "/admin/items",
  },
  {
    id: "05",
    title: "Orders",
    description: "Manage Stripe payments and follow order processing status.",
    href: "/admin/orders",
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl lg:text-6xl">
            Control Center
          </h1>
          <p className="max-w-3xl text-base leading-8 text-green-600">
            Centralize catalog management, highlighted games, and checkout operations in one place.
            Pick a section below to continue.
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-green-900 bg-green-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Active modules</p>
            <p className="mt-2 text-3xl font-black text-green-300">5</p>
          </article>
          <article className="rounded-2xl border border-green-900 bg-green-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Commerce</p>
            <p className="mt-2 text-3xl font-black text-green-300">Stripe Online</p>
          </article>
          <article className="rounded-2xl border border-green-900 bg-green-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Inventory tools</p>
            <p className="mt-2 text-3xl font-black text-green-400">Ready</p>
          </article>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="rounded-[1.75rem] border border-green-900 bg-green-950/20 p-7 transition-all hover:-translate-y-0.5 hover:border-green-700/50 hover:bg-green-950/40"
            >
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">
                Section {section.id}
              </p>
              <h2 className="mt-3 text-3xl font-black text-green-300">{section.title}</h2>
              <p className="mt-3 text-base leading-8 text-green-600">{section.description}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-green-500">Open section</p>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
