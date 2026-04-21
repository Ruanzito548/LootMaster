"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import {
  accountClassOptions,
  accountGenderOptions,
  accountRaceOptions,
  type AccountClass,
  type AccountGender,
  type AccountRace,
} from "../data/accounts";
import { getServersByGameId } from "../data/games";
import { firebaseEnabled } from "../../lib/firebase";
import {
  addAccountToMarket,
  clearAccountsMarket,
  subscribeToAccountsMarket,
  type NewAccountInput,
} from "../../lib/accounts-market";

type AccountsMarketAdminProps = {
  gameId: string;
  gameTitle: string;
};

type FormState = {
  title: string;
  level: number;
  gender: AccountGender;
  race: AccountRace;
  className: AccountClass;
  price: number;
  serverId: string;
  faction: "Horde" | "Alliance";
  professionOne: string;
  professionTwo: string;
  extras: string;
};

function defaultForm(serverId: string): FormState {
  return {
    title: "",
    level: 70,
    gender: "Male",
    race: "Human",
    className: "Warrior",
    price: 100,
    serverId,
    faction: "Horde",
    professionOne: "",
    professionTwo: "",
    extras: "",
  };
}

export function AccountsMarketAdmin({ gameId, gameTitle }: AccountsMarketAdminProps) {
  const servers = useMemo(() => getServersByGameId(gameId), [gameId]);
  const defaultServerId = servers[0]?.id ?? "";

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketCount, setMarketCount] = useState(0);
  const [form, setForm] = useState<FormState>(() => defaultForm(defaultServerId));

  useEffect(() => {
    setForm(defaultForm(defaultServerId));
  }, [defaultServerId]);

  useEffect(
    () =>
      subscribeToAccountsMarket(gameId, (items) => {
        startTransition(() => setMarketCount(items.length));
      }),
    [gameId]
  );

  const serverName =
    servers.find((server) => server.id === form.serverId)?.name ?? "Unknown server";

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSavedMessage(null);
    setErrorMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase nao configurado.");
      return;
    }

    if (form.title.trim() === "") {
      setErrorMessage("Informe um titulo para a conta.");
      return;
    }

    if (form.serverId === "") {
      setErrorMessage("Selecione um servidor.");
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      const highlights = form.extras
        .split(/\r?\n|,|;/)
        .map((part) => part.trim())
        .filter(Boolean);

      const payload: NewAccountInput = {
        gameId,
        title: form.title.trim(),
        serverId: form.serverId,
        serverName,
        faction: form.faction,
        gender: form.gender,
        race: form.race,
        className: form.className,
        level: Math.max(1, Math.round(form.level)),
        price: Math.max(1, Math.round(form.price)),
        professionOne: form.professionOne.trim() || "-",
        professionTwo: form.professionTwo.trim() || "-",
        highlights,
      };

      await addAccountToMarket(payload);
      setForm(defaultForm(form.serverId));
      setSavedMessage("Conta adicionada ao market com sucesso.");
      setShowForm(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase nao configurado.");
      return;
    }

    const confirmed = window.confirm("Excluir todas as contas desse game do market?");
    if (!confirmed) return;

    setClearing(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await clearAccountsMarket(gameId);
      setSavedMessage("Market limpo com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel limpar.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin / Games / Accounts</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">{gameTitle} accounts</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">
            Cadastre contas para venda no market e gerencie os anuncios ativos.
          </p>
        </div>

        {!firebaseEnabled ? (
          <section className="mt-8 rounded-[1.5rem] border border-amber-400/20 bg-amber-400/8 px-6 py-5 text-amber-100">
            <p className="text-sm font-bold uppercase tracking-[0.24em]">Firebase pending</p>
            <p className="mt-3 text-sm leading-7">Add the project environment variables to enable saving.</p>
          </section>
        ) : null}

        <section className="mt-8 loot-panel rounded-[1.75rem] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">Market status</p>
              <p className="mt-3 text-sm text-[#cdb991]">Contas ativas no market: {marketCount}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold"
              >
                {showForm ? "Fechar formulario" : "Adicionar conta ao market"}
              </button>

              <button
                type="button"
                onClick={() => void clearAll()}
                disabled={clearing}
                className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {clearing ? "Limpando..." : "Excluir tudo do market"}
              </button>
            </div>
          </div>

          {showForm ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="grid gap-4">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                  Titulo
                  <input
                    value={form.title}
                    onChange={(event) => onChange("title", event.target.value)}
                    className="loot-input px-4 py-3 text-sm font-semibold"
                    placeholder="Ex.: Orc Fury Warrior PvP"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Lvl
                    <input
                      type="number"
                      min={1}
                      value={form.level}
                      onChange={(event) => onChange("level", Number(event.target.value))}
                      className="loot-input px-4 py-3 text-sm font-semibold"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Price
                    <input
                      type="number"
                      min={1}
                      value={form.price}
                      onChange={(event) => onChange("price", Number(event.target.value))}
                      className="loot-input px-4 py-3 text-sm font-semibold"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Male/Female
                    <select
                      value={form.gender}
                      onChange={(event) => onChange("gender", event.target.value as AccountGender)}
                      className="loot-select px-4 py-3 text-sm font-semibold"
                    >
                      {accountGenderOptions.map((gender) => (
                        <option key={gender} value={gender}>{gender}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Faction
                    <select
                      value={form.faction}
                      onChange={(event) => onChange("faction", event.target.value as "Horde" | "Alliance")}
                      className="loot-select px-4 py-3 text-sm font-semibold"
                    >
                      <option value="Horde">Horde</option>
                      <option value="Alliance">Alliance</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Race
                    <select
                      value={form.race}
                      onChange={(event) => onChange("race", event.target.value as AccountRace)}
                      className="loot-select px-4 py-3 text-sm font-semibold"
                    >
                      {accountRaceOptions.map((race) => (
                        <option key={race} value={race}>{race}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Class
                    <select
                      value={form.className}
                      onChange={(event) => onChange("className", event.target.value as AccountClass)}
                      className="loot-select px-4 py-3 text-sm font-semibold"
                    >
                      {accountClassOptions.map((className) => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                  Server
                  <select
                    value={form.serverId}
                    onChange={(event) => onChange("serverId", event.target.value)}
                    className="loot-select px-4 py-3 text-sm font-semibold"
                  >
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name} ({server.region})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Profissao 1
                    <input
                      value={form.professionOne}
                      onChange={(event) => onChange("professionOne", event.target.value)}
                      className="loot-input px-4 py-3 text-sm font-semibold"
                      placeholder="Ex.: Engineering"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Profissao 2
                    <input
                      value={form.professionTwo}
                      onChange={(event) => onChange("professionTwo", event.target.value)}
                      className="loot-input px-4 py-3 text-sm font-semibold"
                      placeholder="Ex.: Mining"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                  Extras (montaria, rank arena, attunes...)
                  <textarea
                    value={form.extras}
                    onChange={(event) => onChange("extras", event.target.value)}
                    className="loot-input min-h-[10rem] px-4 py-3 text-sm font-semibold"
                    placeholder="Uma linha por item ou separado por virgula"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={saving}
                  className="loot-gold-button w-full rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
                >
                  {saving ? "Salvando..." : "Salvar conta no market"}
                </button>
              </div>
            </div>
          ) : null}

          {savedMessage ? <p className="mt-5 text-sm font-semibold text-emerald-500">{savedMessage}</p> : null}
          {errorMessage ? <p className="mt-5 text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
        </section>

        <div className="mt-8">
          <Link href="/admin/preços/wow" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to WOW sections
          </Link>
        </div>
      </main>
    </div>
  );
}
