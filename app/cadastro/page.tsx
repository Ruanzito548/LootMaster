"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function normalizeRef(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function getReferralFromQuery(params: URLSearchParams) {
  const candidates = [
    params.get("ref"),
    params.get("refId"),
    params.get("ref_id"),
    params.get("agent"),
    params.get("agentId"),
    params.get("agent_id"),
  ];

  const found = candidates.find((item) => normalizeRef(item) !== "");
  return normalizeRef(found);
}

function CadastroContent() {
  const params = useSearchParams();
  const referralFromLink = useMemo(() => getReferralFromQuery(params), [params]);
  const linkToken = useMemo(() => (params.get("token") ?? "").trim(), [params]);

  const handleDiscordSignup = () => {
    // Store referral in sessionStorage so the callback can pick it up
    if (referralFromLink) {
      sessionStorage.setItem("signup_referral", referralFromLink);
    }
    const authUrl = new URL("/api/auth/discord", window.location.origin);
    if (linkToken) {
      authUrl.searchParams.set("linkToken", linkToken);
    }
    window.location.href = authUrl.toString();
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Sign Up</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Create your account
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Connect your Discord account to get started. Your Discord username will be used automatically.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <p className="loot-muted text-sm">
              Your username, avatar, and account details will be pulled directly from Discord — no manual setup needed.
            </p>

            {referralFromLink ? (
              <p className="text-xs font-semibold text-[#a89a7b]">
                Referral code applied: <span className="text-[#f0c060]">{referralFromLink}</span>
              </p>
            ) : null}

            {linkToken ? (
              <p className="text-xs font-semibold text-[#a89a7b]">
                Supplier payout link detected. Complete Discord sign up to bind your account automatically.
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleDiscordSignup}
              className="loot-gold-button flex items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-semibold"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Create account with Discord
            </button>
          </div>
        </section>

        <div className="mt-8">
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
              Back to home
            </Link>
            <Link href="/login" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
              {linkToken ? "I already have an account" : "I already have an account"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function CadastroFallback() {
  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <section className="loot-panel rounded-[1.75rem] p-8">
          <p className="loot-muted text-sm">Loading sign up...</p>
        </section>
      </main>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<CadastroFallback />}>
      <CadastroContent />
    </Suspense>
  );
}
