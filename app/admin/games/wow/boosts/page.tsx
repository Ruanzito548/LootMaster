import Link from "next/link";

export default function WowBoostsPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin / Games / WOW</p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-green-300 sm:text-5xl">Boosts</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-green-600">
          Page ready for boost pricing configuration.
        </p>

        <div className="mt-8">
          <Link href="/admin/games/wow" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
            Back to WOW sections
          </Link>
        </div>
      </main>
    </div>
  );
}
