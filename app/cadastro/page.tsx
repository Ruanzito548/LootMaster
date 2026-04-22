"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db, firebaseEnabled } from "../../lib/firebase";
import { getFriendlyAuthError } from "../../lib/auth-errors";

type FormState = {
  username: string;
};

const defaultForm: FormState = {
  username: "",
};

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

  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const assignedAgentId = referralFromLink || null;

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!firebaseEnabled || !db || !auth) {
      setErrorMessage("Firebase is not configured. Please try again later.");
      return;
    }

    if (form.username.trim() === "") {
      setErrorMessage("Please enter your username before continuing with Google.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      const credentials = await signInWithPopup(auth, provider);

      const googleEmail = credentials.user.email?.trim().toLowerCase() ?? "";
      const username = form.username.trim() || credentials.user.displayName?.trim() || "";

      if (googleEmail === "") {
        setErrorMessage("Your Google account did not provide an email. Try another account.");
        setSaving(false);
        return;
      }

      if (username === "") {
        setErrorMessage("Could not resolve your username. Please type your username and try again.");
        setSaving(false);
        return;
      }

      await setDoc(doc(db, "users", credentials.user.uid), {
        uid: credentials.user.uid,
        username,
        email: googleEmail,
        authProvider: "google",
        assignedAgentId,
        createdAt: serverTimestamp(),
      }, { merge: true });

      const referrer = typeof document !== "undefined" ? document.referrer : "";

      await addDoc(collection(db, "agent-signups"), {
        uid: credentials.user.uid,
        username,
        email: googleEmail,
        referralFromLink,
        assignedAgentId,
        sourcePath: typeof window !== "undefined" ? window.location.pathname : "/cadastro",
        sourceQuery: typeof window !== "undefined" ? window.location.search : "",
        referrer,
        status: "new",
        createdAt: serverTimestamp(),
      });

      setSuccessMessage("Registration completed successfully using Google.");

      setForm(defaultForm);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(getFriendlyAuthError(error.code, "Could not complete registration."));
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Could not complete registration.");
      }
    } finally {
      setSaving(false);
    }
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
            Complete the form and continue with Google to create your account.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Username
              <input
                value={form.username}
                onChange={(event) => onChange("username", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Your username"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Login method
              <input
                value="Google Sign-In"
                disabled
                className="loot-input cursor-not-allowed px-4 py-3 text-sm font-semibold opacity-80"
              />
            </label>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? "Connecting Google..." : "Continue with Google"}
            </button>

            {successMessage ? <p className="text-sm font-semibold text-emerald-500">{successMessage}</p> : null}
            {errorMessage ? <p className="text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
          </div>
        </section>

        <div className="mt-8">
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to home
            </Link>
            <Link href="/login" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
              I already have an account
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
