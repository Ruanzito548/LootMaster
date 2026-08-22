"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useProfileSession } from "@/app/profile/use-profile-session";

type DiscordSettings = {
  autoSendEnabled: boolean;
  updatedAtMs: number;
};

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export function AdminDiscordSettingsClient() {
  const { status: sessionStatus, user } = useProfileSession();
  const [settings, setSettings] = useState<DiscordSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!user) {
      setLoading(false);
      setErrorMessage("Faça login para acessar as configurações do Discord.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const headers = await getAuthorizationHeader(user);
      if (!headers) {
        throw new Error("Sua sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.");
      }

      const response = await fetch("/api/admin/discord-settings", {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const payload = (await response.json()) as { error?: string; settings?: DiscordSettings };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Não foi possível carregar as configurações do Discord.");
      }

      setSettings(payload.settings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as configurações do Discord.");
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleAutoSend = async () => {
    if (!settings || saving) {
      return;
    }

    const nextValue = !settings.autoSendEnabled;
    setSaving(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const headers = await getAuthorizationHeader(user);
      if (!headers) {
        throw new Error("Sua sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.");
      }

      const response = await fetch("/api/admin/discord-settings", {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autoSendEnabled: nextValue }),
      });

      const payload = (await response.json()) as { error?: string; settings?: DiscordSettings };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Não foi possível salvar as configurações do Discord.");
      }

      setSettings(payload.settings);
      setInfoMessage("Configurações do Discord atualizadas com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar as configurações do Discord.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Configurações Discord</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-green-600">
              Controle se novas ordens pagas são enviadas automaticamente para o Discord. Quando desligado, cada ordem
              precisará ser enviada manualmente pela página de detalhes da ordem.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Voltar ao admin
          </Link>
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
            {errorMessage}
          </p>
        ) : null}

        {infoMessage ? (
          <p className="mt-6 rounded-xl border border-green-900 bg-green-950/20 px-5 py-4 text-sm font-medium text-green-300">
            {infoMessage}
          </p>
        ) : null}

        <section className="mt-6 rounded-2xl border border-green-900 bg-black p-6">
          {loading ? (
            <p className="text-sm text-green-600">Carregando configurações...</p>
          ) : settings ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-500">Envio automático ao Discord</p>
                <p className="mt-1 text-sm text-green-600">
                  {settings.autoSendEnabled
                    ? "Ligado — toda ordem paga é enviada automaticamente ao Discord."
                    : "Desligado — envie manualmente pela página de detalhes de cada ordem."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoSendEnabled}
                onClick={() => void toggleAutoSend()}
                disabled={saving}
                className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  settings.autoSendEnabled
                    ? "border-green-600 bg-green-700/60"
                    : "border-green-900 bg-black"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-green-200 transition ${
                    settings.autoSendEnabled ? "translate-x-9" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
