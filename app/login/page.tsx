"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { auth, firebaseEnabled } from "../../lib/firebase";
import { getFriendlyAuthError } from "../../lib/auth-errors";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!firebaseEnabled || !auth) {
      setErrorMessage("Firebase is not configured. Please try again later.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/profile");
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(getFriendlyAuthError(error.code, "Could not sign in."));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Could not sign in.");
      }
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
            Sign in with Google to continue.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <p className="loot-muted text-sm">
              Your session will be created using your Google account.
            </p>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {loading ? "Connecting Google..." : "Continue with Google"}
            </button>

            {errorMessage ? <p className="text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Create account
          </Link>
          <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
