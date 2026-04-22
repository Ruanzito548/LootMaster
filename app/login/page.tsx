"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth, firebaseEnabled } from "../../lib/firebase";

type LoginForm = {
  email: string;
  password: string;
};

const defaultForm: LoginForm = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onChange = <K extends keyof LoginForm>(key: K, value: LoginForm[K]) => {
    setErrorMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!firebaseEnabled || !auth) {
      setErrorMessage("Firebase is not configured. Please try again later.");
      return;
    }

    if (form.email.trim() === "") {
      setErrorMessage("Please enter your email.");
      return;
    }

    if (form.password.trim() === "") {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signInWithEmailAndPassword(
        auth,
        form.email.trim().toLowerCase(),
        form.password
      );
      router.push("/profile");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not sign in.");
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
            Sign in with your email and password to continue.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => onChange("email", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="you@email.com"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => onChange("password", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Your password"
              />
            </label>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
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
