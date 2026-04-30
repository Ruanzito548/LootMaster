import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-32 text-center lg:px-8">
        <div className="loot-panel rounded-[2rem] p-12">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#ff4040]/12 text-5xl">
            ✕
          </div>
          <h1 className="loot-title mt-8 text-4xl font-black leading-tight sm:text-5xl">
            Payment cancelled
          </h1>
          <p className="loot-muted mx-auto mt-6 max-w-md text-base leading-8">
            Your order was not completed. You can go back and try again whenever you are ready.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/games"
              className="loot-gold-button rounded-full px-6 py-3 text-sm font-semibold"
            >
              Back to games
            </Link>
            <Link
              href="/"
              className="loot-secondary-button rounded-full px-6 py-3 text-sm font-semibold"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
