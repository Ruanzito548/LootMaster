"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth, firebaseEnabled } from "../../lib/firebase";
import { getFriendlyAuthError } from "../../lib/auth-errors";

const DISCORD_ERROR_LABELS: Record<string, string> = {
  access_denied: "Discord access denied. Please try again.",
  token_exchange_failed: "Could not exchange Discord token. Please try again.",
  user_fetch_failed: "Could not fetch your Discord profile. Please try again.",
  server_misconfigured: "Discord OAuth is not configured on this server.",
};

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const linkToken = (params.get("token") ?? "").trim();

  // Handle Discord callback: customToken or error in query params
  useEffect(() => {
    const customToken = params.get("customToken");
    const error = params.get("error");

    if (error) {
      setErrorMessage(DISCORD_ERROR_LABELS[error] ?? "An error occurred. Please try again.");
      return;
    }

    if (!customToken || !auth) {
      return;
    }

    setLoading(true);
    signInWithCustomToken(auth, customToken)
      .then(() => {
        router.replace("/profile");
      })
      .catch((err: unknown) => {
        if (err instanceof FirebaseError) {
          setErrorMessage(getFriendlyAuthError(err.code, "Could not sign in."));
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Could not sign in.");
        }
        setLoading(false);
      });
  }, [params, router]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setLoggedIn(Boolean(user));
    });
  }, []);

  const loginWithDiscord = () => {
    const authUrl = new URL("/api/auth/discord", window.location.origin);
    if (linkToken) {
      authUrl.searchParams.set("linkToken", linkToken);
    }
    window.location.href = authUrl.toString();
  };

  const loginWithGoogle = async () => {
    if (!auth) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/profile");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setErrorMessage(getFriendlyAuthError(err.code, "Could not sign in with Google."));
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Could not sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!auth) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signOut(auth);
      setLoggedIn(false);
      router.push("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Login</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Access your account</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            {loggedIn ? "You are already signed in." : "Sign in with Discord or Google to continue."}
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <p className="loot-muted text-sm">
              Your session will be created using your Discord account. Your Discord username will be linked automatically.
            </p>

            {linkToken ? (
              <p className="text-xs font-semibold text-[#a89a7b]">
                Supplier payout link detected. Continue with Discord to bind this site account to your supplier wallet.
              </p>
            ) : null}

            <button
              type="button"
              onClick={loginWithDiscord}
              disabled={loading || loggedIn || !firebaseEnabled}
              className="loot-gold-button flex items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              {loading ? "Connecting..." : loggedIn ? "Already connected" : "Continue with Discord"}
            </button>

            <button
              type="button"
              onClick={() => void loginWithGoogle()}
              disabled={loading || loggedIn || !firebaseEnabled || Boolean(linkToken)}
              className="loot-secondary-button flex items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.48c-.24 1.26-.96 2.33-2.04 3.06l3.3 2.56c1.92-1.77 3.03-4.37 3.03-7.46 0-.73-.07-1.43-.19-2.1H12z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.3-2.56c-.92.62-2.09.99-3.32.99-2.55 0-4.71-1.72-5.48-4.02H3.1v2.63A10 10 0 0 0 12 22z"
                />
                <path
                  fill="#4A90E2"
                  d="M6.52 13.98A5.98 5.98 0 0 1 6.2 12c0-.69.12-1.36.32-1.98V7.39H3.1A10 10 0 0 0 2 12c0 1.61.38 3.14 1.1 4.61l3.42-2.63z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 5.98c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.97 2.98 14.7 2 12 2a10 10 0 0 0-8.9 5.39l3.42 2.63C7.29 7.7 9.45 5.98 12 5.98z"
                />
              </svg>
              {loading ? "Connecting..." : loggedIn ? "Already connected" : "Continue with Google"}
            </button>

            {linkToken ? (
              <p className="text-xs font-semibold text-[#a89a7b]">
                Google login is unavailable for supplier linking. Use Discord to continue.
              </p>
            ) : null}

            {loggedIn ? (
              <button
                type="button"
                onClick={() => void logout()}
                disabled={loading}
                className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                Sign out
              </button>
            ) : null}

            {errorMessage ? <p className="text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={linkToken ? `/cadastro?token=${encodeURIComponent(linkToken)}` : "/cadastro"} className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Create account
          </Link>
          {loggedIn ? (
            <Link href="/profile" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
              Go to profile
            </Link>
          ) : null}
          <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

