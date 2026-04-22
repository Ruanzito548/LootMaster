"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db, firebaseEnabled } from "../../lib/firebase";

type FormState = {
  fullName: string;
  email: string;
  game: string;
};

const defaultForm: FormState = {
  fullName: "",
  email: "",
  game: "",
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
    if (!firebaseEnabled || !db) {
      setErrorMessage("Firebase is not configured. Please try again later.");
      return;
    }

    if (form.fullName.trim() === "") {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (form.email.trim() === "") {
      setErrorMessage("Please enter your email.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const referrer = typeof document !== "undefined" ? document.referrer : "";

      await addDoc(collection(db, "agent-signups"), {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        game: form.game.trim(),
        referralFromLink,
        assignedAgentId,
        sourcePath: typeof window !== "undefined" ? window.location.pathname : "/cadastro",
        sourceQuery: typeof window !== "undefined" ? window.location.search : "",
        referrer,
        status: "new",
        createdAt: serverTimestamp(),
      });

      setSuccessMessage("Registration completed successfully.");

      setForm(defaultForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not complete registration.");
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
            Complete the form below to register your account.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Full name
              <input
                value={form.fullName}
                onChange={(event) => onChange("fullName", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Your full name"
              />
            </label>

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
              Game of interest
              <input
                value={form.game}
                onChange={(event) => onChange("game", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="E.g.: TBC Anniversary"
              />
            </label>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? "Completing registration..." : "Complete registration"}
            </button>

            {successMessage ? <p className="text-sm font-semibold text-emerald-500">{successMessage}</p> : null}
            {errorMessage ? <p className="text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
          </div>
        </section>

        <div className="mt-8">
          <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to home
          </Link>
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
