import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#10192d_0%,#0b1324_45%,#070b14_100%)] text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
            Admin
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Admin area
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-400">
            Choose which admin section you want to open.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Link
            href="/admin/manage-hots"
            className="rounded-[1.75rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)] transition-colors hover:border-cyan-300/20 hover:bg-white/4"
          >
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
              Section 01
            </p>
            <h2 className="mt-4 text-3xl font-black">Manage hots</h2>
            <p className="mt-4 text-base leading-8 text-slate-400">
              Control which games appear in the highlighted section.
            </p>
          </Link>

          <Link
            href="/admin/gold-settings"
            className="rounded-[1.75rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)] transition-colors hover:border-cyan-300/20 hover:bg-white/4"
          >
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
              Section 02
            </p>
            <h2 className="mt-4 text-3xl font-black">Gold settings</h2>
            <p className="mt-4 text-base leading-8 text-slate-400">
              Update gold value, minimum purchase and the funnel selection flow.
            </p>
          </Link>

          <Link
            href="/admin/dashboard"
            className="rounded-[1.75rem] border border-white/8 bg-[#0c1324] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.35)] transition-colors hover:border-cyan-300/20 hover:bg-white/4"
          >
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
              Section 03
            </p>
            <h2 className="mt-4 text-3xl font-black">Dashboard</h2>
            <p className="mt-4 text-base leading-8 text-slate-400">
              Reserved for future tools, controls and admin features.
            </p>
          </Link>
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
