"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db, firebaseEnabled } from "../../lib/firebase";

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  game: string;
  referralId: string;
};

const defaultForm: FormState = {
  fullName: "",
  email: "",
  whatsapp: "",
  game: "",
  referralId: "",
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

export default function CadastroPage() {
  const params = useSearchParams();
  const referralFromLink = useMemo(() => getReferralFromQuery(params), [params]);

  const [form, setForm] = useState<FormState>(() => ({
    ...defaultForm,
    referralId: referralFromLink,
  }));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const assignedAgentId = normalizeRef(form.referralId) || referralFromLink || null;

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!firebaseEnabled || !db) {
      setErrorMessage("Firebase nao configurado. Tente novamente mais tarde.");
      return;
    }

    if (form.fullName.trim() === "") {
      setErrorMessage("Informe seu nome.");
      return;
    }

    if (form.email.trim() === "") {
      setErrorMessage("Informe seu email.");
      return;
    }

    if (form.whatsapp.trim() === "") {
      setErrorMessage("Informe seu WhatsApp.");
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
        whatsapp: form.whatsapp.trim(),
        game: form.game.trim(),
        referralIdInput: normalizeRef(form.referralId),
        referralFromLink,
        assignedAgentId,
        sourcePath: typeof window !== "undefined" ? window.location.pathname : "/cadastro",
        sourceQuery: typeof window !== "undefined" ? window.location.search : "",
        referrer,
        status: "new",
        createdAt: serverTimestamp(),
      });

      setSuccessMessage(
        assignedAgentId
          ? `Cadastro realizado com sucesso. Vinculado ao agente ${assignedAgentId}.`
          : "Cadastro realizado com sucesso."
      );

      setForm((current) => ({
        ...defaultForm,
        referralId: current.referralId,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel finalizar o cadastro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Cadastro</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">
            Crie sua conta e vincule seu agente
          </h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Se voce chegou por link de afiliado/agente, o sistema ja identifica automaticamente. Voce tambem pode informar um ID de referencia manualmente.
          </p>
        </div>

        <section className="loot-panel mt-8 rounded-[1.75rem] p-8">
          <div className="grid gap-5">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Nome completo
              <input
                value={form.fullName}
                onChange={(event) => onChange("fullName", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Seu nome"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  className="loot-input px-4 py-3 text-sm font-semibold"
                  placeholder="voce@email.com"
                />
              </label>

              <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                WhatsApp
                <input
                  value={form.whatsapp}
                  onChange={(event) => onChange("whatsapp", event.target.value)}
                  className="loot-input px-4 py-3 text-sm font-semibold"
                  placeholder="(00) 00000-0000"
                />
              </label>
            </div>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Jogo de interesse
              <input
                value={form.game}
                onChange={(event) => onChange("game", event.target.value)}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Ex.: TBC Anniversary"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              ID de referencia (opcional)
              <input
                value={form.referralId}
                onChange={(event) => onChange("referralId", event.target.value.toUpperCase())}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Ex.: AGT-1024"
              />
            </label>

            <div className="rounded-[1rem] border border-[#84d5ff]/18 bg-[#0d3f7a]/24 p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff]">Vinculo de agente</p>
              <p className="mt-2 text-[#f8eed4]">
                {assignedAgentId
                  ? `Este cadastro sera vinculado ao agente ${assignedAgentId}.`
                  : "Nenhum agente detectado no momento."}
              </p>
              {referralFromLink ? (
                <p className="mt-1 text-[#9ed7ff]">Detectado pelo link: {referralFromLink}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? "Finalizando cadastro..." : "Finalizar cadastro"}
            </button>

            {successMessage ? <p className="text-sm font-semibold text-emerald-500">{successMessage}</p> : null}
            {errorMessage ? <p className="text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
          </div>
        </section>

        <div className="mt-8">
          <Link href="/" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Voltar para home
          </Link>
        </div>
      </main>
    </div>
  );
}
