"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const deliveryMethod = searchParams.get("delivery_method");
  const deliveryTime = deliveryMethod === "Mailbox"
    ? "Your gold will be delivered by mail within up to 2 hours."
    : deliveryMethod === "Face to face"
      ? "Your gold will be delivered face to face within up to 30 minutes."
      : "Your delivery time depends on the delivery method selected during checkout.";

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-32 text-center lg:px-8">
        <div className="loot-panel rounded-[2rem] p-12">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#1eff00]/12 text-5xl">
            ✓
          </div>
          <h1 className="loot-title mt-8 text-4xl font-black leading-tight sm:text-5xl">
            Order confirmed!
          </h1>
          <p className="loot-muted mx-auto mt-6 max-w-md text-base leading-8">
            Your payment was received. We will process your order and deliver your gold shortly.
            Check your email for the receipt.
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-[color:var(--text-muted)]">
            <p>{deliveryTime}</p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/profile/history"
              className="loot-gold-button rounded-full px-6 py-3 text-sm font-semibold"
            >
              View order history
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

export default function CheckoutSuccessPage() {
  return <Suspense><CheckoutSuccessContent /></Suspense>;
}
