"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

import { games } from "../data/games";
import { auth, firebaseEnabled } from "../../lib/firebase";
import {
  createInventoryItem,
  resetInventoryItemsToDefaultTickets,
  subscribeToInventoryItems,
  wowRarities,
  type WowRarity,
} from "../../lib/inventory-items";
import { grantRuanzitoTicketPack } from "../../lib/profile-admin";

type ItemForm = {
  name: string;
  rarity: WowRarity;
  iconPath: string;
  gameId: string;
};

const defaultForm: ItemForm = {
  name: "Explorer Ticket",
  rarity: "uncommon",
  iconPath: "/itens/general/ticket.png",
  gameId: "general",
};

export function InventoryItemsAdmin() {
  const [form, setForm] = useState<ItemForm>(defaultForm);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [grantingPack, setGrantingPack] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemsCount, setItemsCount] = useState(0);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  useEffect(() => subscribeToInventoryItems((items) => setItemsCount(items.length)), []);

  const saveItem = async () => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase not configured.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage("Sign in before creating items.");
      return;
    }

    if (form.name.trim() === "") {
      setErrorMessage("Enter item name.");
      return;
    }

    if (form.iconPath.trim() === "") {
      setErrorMessage("Enter icon path in /itens/... format.");
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await createInventoryItem({
        name: form.name.trim(),
        rarity: form.rarity,
        iconPath: form.iconPath.trim(),
        gameId: form.gameId,
      });

      setSavedMessage("Item created successfully.");
      setForm(defaultForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create item.");
    } finally {
      setSaving(false);
    }
  };

  const seedTickets = async () => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase not configured.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage("Sign in before creating items.");
      return;
    }

    setResetting(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await resetInventoryItemsToDefaultTickets();
      setSavedMessage("Catalog reset with 3 ticket items (common, uncommon, epic).");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not reset catalog.");
    } finally {
      setResetting(false);
    }
  };

  const grantRuanzitoPack = async () => {
    if (!firebaseEnabled) {
      setErrorMessage("Firebase not configured.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage("Sign in before editing profile inventory.");
      return;
    }

    setGrantingPack(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      await grantRuanzitoTicketPack();
      setSavedMessage("3 tickets were added to ruanzito548@gmail.com inventory (common, rare, epic).");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update ruanzito profile inventory.");
    } finally {
      setGrantingPack(false);
    }
  };

  return (
    <div className="loot-shell">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-4">
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.28em]">Admin / Games / WOW</p>
          <h1 className="loot-title text-4xl font-black leading-tight sm:text-5xl">Inventory Items</h1>
          <p className="loot-muted max-w-2xl text-base leading-8">Create inventory items used by the Minecraft-style 3x3 grid.</p>
        </div>

        <section className="loot-panel mt-8 rounded-[2rem] p-8">
          <p className="loot-muted text-sm">Registered items: {itemsCount}</p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Item name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="Example: Forest Totem"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Item rarity (WoW)
              <select
                value={form.rarity}
                onChange={(event) => setForm((current) => ({ ...current, rarity: event.target.value as WowRarity }))}
                className="loot-select px-4 py-3 text-sm font-semibold"
              >
                {wowRarities.map((rarity) => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Item icon path
              <input
                value={form.iconPath}
                onChange={(event) => setForm((current) => ({ ...current, iconPath: event.target.value }))}
                className="loot-input px-4 py-3 text-sm font-semibold"
                placeholder="/itens/general/uncommon-test.png"
              />
            </label>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
              Item game scope
              <select
                value={form.gameId}
                onChange={(event) => setForm((current) => ({ ...current, gameId: event.target.value }))}
                className="loot-select px-4 py-3 text-sm font-semibold"
              >
                <option value="general">General</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>{game.title}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveItem()}
              disabled={saving}
              className="loot-gold-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {saving ? "Saving item..." : "Save item"}
            </button>

            <button
              type="button"
              onClick={() => setForm(defaultForm)}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold"
            >
              Reset form to ticket item
            </button>

            <button
              type="button"
              onClick={() => void seedTickets()}
              disabled={resetting}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {resetting ? "Resetting catalog..." : "Remove all and create 3 ticket items"}
            </button>

            <button
              type="button"
              onClick={() => void grantRuanzitoPack()}
              disabled={grantingPack}
              className="loot-secondary-button rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {grantingPack
                ? "Granting tickets to ruanzito..."
                : "Create 3 tickets for ruanzito548@gmail.com"}
            </button>
          </div>

          {savedMessage ? <p className="mt-4 text-sm font-semibold text-emerald-500">{savedMessage}</p> : null}
          {errorMessage ? <p className="mt-4 text-sm font-semibold text-rose-500">{errorMessage}</p> : null}
        </section>
      </main>
    </div>
  );
}
