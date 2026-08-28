"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useProfileSession } from "@/app/profile/use-profile-session";

type DiscordSettings = {
  autoSendEnabled: boolean;
  channelsByGame: Record<string, string>;
  updatedAtMs: number;
};

const GAME_LABELS: { gameId: string; label: string }[] = [
  { gameId: "tbc-anniversary", label: "WoW TBC Anniversary" },
  { gameId: "retail", label: "WoW Retail" },
  { gameId: "classic-era", label: "WoW Classic Era" },
  { gameId: "mist-of-pandaria", label: "WoW Mist of Pandaria" },
];

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

export function AdminDiscordSettingsClient() {
  const { status: sessionStatus, user } = useProfileSession();
  const [settings, setSettings] = useState<DiscordSettings | null>(null);
  const [channelInputs, setChannelInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);
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
      setChannelInputs(payload.settings.channelsByGame ?? {});
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

  const saveChannels = async () => {
    if (saving || savingChannels) {
      return;
    }

    setSavingChannels(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const headers = await getAuthorizationHeader(user);
      if (!headers) {
        throw new Error("Sua sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.");
      }

      const channelsByGame = Object.fromEntries(
        Object.entries(channelInputs).map(([gameId, value]) => [gameId, value.trim()]),
      );

      const response = await fetch("/api/admin/discord-settings", {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelsByGame }),
      });

      const payload = (await response.json()) as { error?: string; settings?: DiscordSettings };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "Não foi possível salvar os canais do Discord.");
      }

      setSettings(payload.settings);
      setChannelInputs(payload.settings.channelsByGame ?? {});
      setInfoMessage("Canais do Discord por jogo atualizados com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar os canais do Discord.");
    } finally {
      setSavingChannels(false);
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
            <div className="flex min-h-16 items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-500">Envio automático ao Discord</p>
                <p className="mt-1 text-sm text-green-600">Carregando configuração...</p>
              </div>
              <span className="h-9 w-16 animate-pulse rounded-full border border-green-900 bg-green-950/40" aria-hidden="true" />
            </div>
          ) : settings ? (
            <div className="flex flex-wrap items-center justify-between gap-6">
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
                aria-label={settings.autoSendEnabled ? "Desativar envio automático ao Discord" : "Ativar envio automático ao Discord"}
                aria-checked={settings.autoSendEnabled}
                onClick={() => void toggleAutoSend()}
                disabled={saving}
                className={`relative inline-flex h-10 w-20 shrink-0 items-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  settings.autoSendEnabled
                    ? "border-green-600 bg-green-700/60"
                    : "border-green-900 bg-black"
                }`}
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full bg-green-200 shadow-[0_0_12px_rgba(134,239,172,0.55)] transition ${
                    settings.autoSendEnabled ? "translate-x-10" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-green-900 bg-black p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-500">Canal do Discord por jogo</p>
          <p className="mt-1 text-sm text-green-600">
            Informe o ID do canal do Discord de cada jogo (clique com o botão direito no canal → Copiar ID do canal).
            Tem prioridade sobre as variáveis de ambiente DISCORD_CHANNEL_* / DISCORD_WEBHOOK_*.
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-green-600">Carregando configurações...</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {GAME_LABELS.map(({ gameId, label }) => (
                <div key={gameId} className="grid gap-1 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-3">
                  <label htmlFor={`discord-channel-${gameId}`} className="text-sm font-medium text-green-400">
                    {label}
                  </label>
                  <input
                    id={`discord-channel-${gameId}`}
                    value={channelInputs[gameId] ?? ""}
                    onChange={(event) =>
                      setChannelInputs((current) => ({ ...current, [gameId]: event.target.value }))
                    }
                    placeholder="ID do canal do Discord"
                    className="rounded-xl border border-green-900 bg-black/30 px-3 py-2 text-sm text-green-100 outline-none focus:border-green-700"
                  />
                </div>
              ))}

              <div>
                <button
                  type="button"
                  onClick={() => void saveChannels()}
                  disabled={savingChannels}
                  className="mt-2 inline-flex items-center rounded-md border border-green-700 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingChannels ? "Salvando..." : "Salvar canais"}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
