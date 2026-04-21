"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import {
  type AccountListing,
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
  deleteAccountFromMarket,
  subscribeToAccountsMarket,
  type NewAccountInput,
} from "../../lib/accounts-market";

type AccountsMarketAdminProps = {
  defaultWowGameId?: string;
};

const wowGameOptions = [
  { id: "tbc-anniversary", title: "World of Warcraft TBC Anniversary", shortTitle: "TBC" },
  { id: "classic-era", title: "World of Warcraft Classic Era", shortTitle: "Classic" },
  { id: "retail", title: "World of Warcraft Midnight", shortTitle: "Retail" },
] as const;

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

export function AccountsMarketAdmin({ defaultWowGameId = "tbc-anniversary" }: AccountsMarketAdminProps) {
  const [selectedWowGameId, setSelectedWowGameId] = useState(defaultWowGameId);
  const selectedWowGame =
    wowGameOptions.find((game) => game.id === selectedWowGameId) ?? wowGameOptions[0];
  const servers = useMemo(() => getServersByGameId(selectedWowGameId), [selectedWowGameId]);
  const defaultServerId = servers[0]?.id ?? "";

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketCount, setMarketCount] = useState(0);
  const [marketItems, setMarketItems] = useState<AccountListing[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm(defaultServerId));

  useEffect(() => {
    const fallbackServerId = defaultServerId || `${selectedWowGameId}-global`;
    setForm(defaultForm(fallbackServerId));
  }, [defaultServerId, selectedWowGameId]);

  useEffect(
    () =>
      subscribeToAccountsMarket(selectedWowGameId, (items) => {
        startTransition(() => {
          setMarketCount(items.length);
          setMarketItems(items);
        });
      }),
    [selectedWowGameId]
  );

  const serverName =
    servers.find((server) => server.id === form.serverId)?.name ?? `${selectedWowGame.shortTitle} Global`;

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

    if (servers.length > 0 && form.serverId === "") {
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
        gameId: selectedWowGameId,
        title: form.title.trim(),
        serverId: form.serverId || `${selectedWowGameId}-global`,
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
      setForm(defaultForm(payload.serverId));
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

    const confirmed = window.confirm(`Excluir todas as contas de ${selectedWowGame.shortTitle} do market?`);
    if (!confirmed) return;

    setClearing(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await clearAccountsMarket(selectedWowGameId);
      setSavedMessage("Market limpo com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel limpar.");
    } finally {
      setClearing(false);
    }
  };

  const removeOne = async (accountId: string, title: string) => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase nao configurado.");
      return;
    }

    const confirmed = window.confirm(`Excluir a conta \"${title}\" do market?`);
    if (!confirmed) return;

    setDeletingId(accountId);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await deleteAccountFromMarket(accountId);
      setSavedMessage("Conta removida do market.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel excluir.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin / Games / Accounts</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">{selectedWowGame.title} accounts</h1>
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
              <label className="mt-3 grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                WOW version
                <select
                  value={selectedWowGameId}
                  onChange={(event) => setSelectedWowGameId(event.target.value)}
                  className="loot-select w-full max-w-[20rem] px-4 py-3 text-sm font-semibold"
                >
                  {wowGameOptions.map((game) => (
                    <option key={game.id} value={game.id}>{game.title}</option>
                  ))}
                </select>
              </label>
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
                {servers.length > 0 ? (
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
                ) : (
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
                    Server
                    <input
                      value={`${selectedWowGame.shortTitle} Global`}
                      disabled
                      className="loot-input cursor-not-allowed px-4 py-3 text-sm font-semibold opacity-80"
                    />
                  </label>
                )}

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

          <div className="mt-8 border-t border-[#ffd76a]/10 pt-6">
            <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">Contas no market</p>

            {marketItems.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {marketItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1rem] border border-[#ffd76a]/10 bg-white/4 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="loot-title text-xl font-black">{item.title}</h3>
                        <p className="mt-1 text-xs text-[#a89a7b]">
                          {item.serverName} / {item.faction} / {item.race} {item.className}
                        </p>
                        <p className="mt-1 text-xs text-[#7d8597]">
                          Lv {item.level} • ${item.price} • {item.gender}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeOne(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="loot-secondary-button rounded-full px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed"
                      >
                        {deletingId === item.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#7d8597]">Nenhuma conta cadastrada no market.</p>
            )}
          </div>
        </section>

        <div className="mt-8">
          <Link href="/admin/games/wow" className="loot-secondary-button inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors">
            Back to WOW sections
          </Link>
        </div>
      </main>
    </div>
  );
}
