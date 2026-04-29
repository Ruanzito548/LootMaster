import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">
            Admin
          </p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Admin area
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Choose which admin section you want to open.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-4">
          <Link
            href="/admin/manage-hots"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">
              Section 01
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">Manage hots</h2>
            <p className="loot-muted mt-4 text-base leading-8">
              Control which games appear in the highlighted section.
            </p>
          </Link>

          <Link
            href="/admin/games"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">
              Section 02
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">Games</h2>
            <p className="loot-muted mt-4 text-base leading-8">
              Choose the game and service type to edit settings.
            </p>
          </Link>

          <Link
            href="/admin/dashboard"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">
              Section 03
            </p>
            <h2 className="loot-title mt-4 text-3xl font-black">Dashboard</h2>
            <p className="loot-muted mt-4 text-base leading-8">
              Reserved for future tools, controls and admin features.
            </p>
          </Link>

          <Link
            href="/admin/items"
            className="loot-panel rounded-[1.75rem] p-8 transition-colors hover:border-[#4dc6ff]/20 hover:bg-white/4"
          >
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">Section 04</p>
            <h2 className="loot-title mt-4 text-3xl font-black">Inventory Items</h2>
            <p className="loot-muted mt-4 text-base leading-8">
              Create item name, WoW rarity, and ticket icon path for inventory slots.
            </p>
          </Link>
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
