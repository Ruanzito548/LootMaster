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
      setErrorMessage("Firebase not configured.");
      return;
    }

    if (form.title.trim() === "") {
      setErrorMessage("Enter a title for the account.");
      return;
    }

    if (servers.length > 0 && form.serverId === "") {
      setErrorMessage("Select a server.");
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
      setSavedMessage("Account successfully added to the market.");
      setShowForm(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase not configured.");
      return;
    }

    const confirmed = window.confirm(`Delete all ${selectedWowGame.shortTitle} accounts from the market?`);
    if (!confirmed) return;

    setClearing(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await clearAccountsMarket(selectedWowGameId);
      setSavedMessage("Market cleared successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not clear.");
    } finally {
      setClearing(false);
    }
  };

  const removeOne = async (accountId: string, title: string) => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase not configured.");
      return;
    }

    const confirmed = window.confirm(`Delete account \"${title}\" from the market?`);
    if (!confirmed) return;

    setDeletingId(accountId);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await deleteAccountFromMarket(accountId);
      setSavedMessage("Account removed from the market.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin / Games / Accounts</p>
          <h1 className="text-4xl font-black leading-tight text-green-300 sm:text-5xl">{selectedWowGame.title} accounts</h1>
          <p className="max-w-2xl text-base leading-8 text-green-600">
            Register accounts for sale and manage active listings.
          </p>
        </div>

        {!firebaseEnabled ? (
          <section className="mt-8 rounded-[1.5rem] border border-amber-400/20 bg-amber-400/8 px-6 py-5 text-amber-100">
            <p className="text-sm font-bold uppercase tracking-[0.24em]">Firebase pending</p>
            <p className="mt-3 text-sm leading-7">Add the project environment variables to enable saving.</p>
          </section>
        ) : null}

        <section className="mt-8 rounded-[1.75rem] border border-green-900 bg-green-950/20 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Market status</p>
              <label className="mt-3 grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                WOW version
                <select
                  value={selectedWowGameId}
                  onChange={(event) => setSelectedWowGameId(event.target.value)}
                  className="w-full max-w-[20rem] rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                >
                  {wowGameOptions.map((game) => (
                    <option key={game.id} value={game.id}>{game.title}</option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-sm text-green-500">Active accounts in market: {marketCount}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900"
              >
                {showForm ? "Close form" : "Add account to market"}
              </button>

              <button
                type="button"
                onClick={() => void clearAll()}
                disabled={clearing}
                className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {clearing ? "Clearing..." : "Delete all from market"}
              </button>
            </div>
          </div>

          {showForm ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="grid gap-4">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                  Title
                  <input
                    value={form.title}
                    onChange={(event) => onChange("title", event.target.value)}
                    className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none placeholder:text-green-800 focus:border-green-600"
                    placeholder="Ex: Orc Fury Warrior PvP"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Lvl
                    <input
                      type="number"
                      min={1}
                      value={form.level}
                      onChange={(event) => onChange("level", Number(event.target.value))}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Price
                    <input
                      type="number"
                      min={1}
                      value={form.price}
                      onChange={(event) => onChange("price", Number(event.target.value))}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Male/Female
                    <select
                      value={form.gender}
                      onChange={(event) => onChange("gender", event.target.value as AccountGender)}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    >
                      {accountGenderOptions.map((gender) => (
                        <option key={gender} value={gender}>{gender}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Faction
                    <select
                      value={form.faction}
                      onChange={(event) => onChange("faction", event.target.value as "Horde" | "Alliance")}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    >
                      <option value="Horde">Horde</option>
                      <option value="Alliance">Alliance</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Race
                    <select
                      value={form.race}
                      onChange={(event) => onChange("race", event.target.value as AccountRace)}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    >
                      {accountRaceOptions.map((race) => (
                        <option key={race} value={race}>{race}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Class
                    <select
                      value={form.className}
                      onChange={(event) => onChange("className", event.target.value as AccountClass)}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
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
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Server
                    <select
                      value={form.serverId}
                      onChange={(event) => onChange("serverId", event.target.value)}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none focus:border-green-600"
                    >
                      {servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name} ({server.region})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Server
                    <input
                      value={`${selectedWowGame.shortTitle} Global`}
                      disabled
                      className="cursor-not-allowed rounded-xl border border-green-900 bg-black px-4 py-3 text-sm font-semibold text-green-600 opacity-80 outline-none"
                    />
                  </label>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Profession 1
                    <input
                      value={form.professionOne}
                      onChange={(event) => onChange("professionOne", event.target.value)}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none placeholder:text-green-800 focus:border-green-600"
                      placeholder="Ex.: Engineering"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                    Profession 2
                    <input
                      value={form.professionTwo}
                      onChange={(event) => onChange("professionTwo", event.target.value)}
                      className="rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none placeholder:text-green-800 focus:border-green-600"
                      placeholder="Ex.: Mining"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                  Extras (mount, arena rating, attunes...)
                  <textarea
                    value={form.extras}
                    onChange={(event) => onChange("extras", event.target.value)}
                    className="min-h-[10rem] rounded-xl border border-green-800 bg-black px-4 py-3 text-sm font-semibold text-green-300 outline-none placeholder:text-green-800 focus:border-green-600"
                    placeholder="One item per line or separated by commas"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={saving}
                  className="w-full rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save account to market"}
                </button>
              </div>
            </div>
          ) : null}

          {savedMessage ? <p className="mt-5 text-sm font-semibold text-emerald-500">{savedMessage}</p> : null}
          {errorMessage ? <p className="mt-5 text-sm font-semibold text-rose-500">{errorMessage}</p> : null}

          <div className="mt-8 border-t border-green-900 pt-6">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Accounts in market</p>

            {marketItems.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {marketItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1rem] border border-green-900 bg-green-950/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-green-300">{item.title}</h3>
                        <p className="mt-1 text-xs text-green-600">
                          {item.serverName} / {item.faction} / {item.race} {item.className}
                        </p>
                        <p className="mt-1 text-xs text-green-700">
                          Lv {item.level} • ${item.price} • {item.gender}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeOne(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="rounded-md border border-green-800 px-4 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-green-700">No accounts registered in market.</p>
            )}
          </div>
        </section>

        <div className="mt-8">
          <Link href="/admin/games/wow" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
            Back to WOW sections
          </Link>
        </div>
      </main>
    </div>
  );
}
