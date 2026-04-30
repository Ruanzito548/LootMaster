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
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em] text-[#9dd4ff]">
            Admin
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            Control Center
          </h1>
          <p className="loot-muted max-w-3xl text-base leading-8">
            Centralize catalog management, highlighted games, and checkout operations in one place.
            Pick a section below to continue.
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="loot-panel rounded-2xl border border-[#84d5ff]/16 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9cb3d5]">Active modules</p>
            <p className="mt-2 text-3xl font-black text-[#e7f2ff]">5</p>
          </article>
          <article className="loot-panel rounded-2xl border border-[#ffd76a]/16 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9cb3d5]">Commerce</p>
            <p className="mt-2 text-3xl font-black text-[#ffcf57]">Stripe Online</p>
          </article>
          <article className="loot-panel rounded-2xl border border-[#1eff00]/16 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9cb3d5]">Inventory tools</p>
            <p className="mt-2 text-3xl font-black text-[#b6ff9e]">Ready</p>
          </article>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="loot-panel rounded-[1.75rem] border border-[#ffffff12] p-7 transition-all hover:-translate-y-0.5 hover:border-[#4dc6ff]/30 hover:bg-white/5"
            >
              <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em] text-[#8dcfff]">
                Section {section.id}
              </p>
              <h2 className="loot-title mt-3 text-3xl font-black">{section.title}</h2>
              <p className="loot-muted mt-3 text-base leading-8">{section.description}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#9cb3d5]">Open section</p>
            </Link>
          ))}
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
