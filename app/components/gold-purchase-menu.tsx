"use client";

import { startTransition, useEffect, useState } from "react";

import { defaultGoldConfig, goldSelectionModes } from "../data/gold-config";
import type { GameServer } from "../data/games";
import { subscribeToGoldConfig } from "../../lib/gold-config";

type GoldPurchaseMenuProps = {
  gameTitle: string;
  categoryTitle: string;
  servers: GameServer[];
};

export function GoldPurchaseMenu({
  gameTitle,
  categoryTitle,
  servers,
}: GoldPurchaseMenuProps) {
  const [goldConfig, setGoldConfig] = useState(defaultGoldConfig);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [goldAmount, setGoldAmount] = useState(defaultGoldConfig.minGold);
  const [nickname, setNickname] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Face to face");
  const [email, setEmail] = useState("");

  useEffect(
    () =>
      subscribeToGoldConfig((config) => {
        startTransition(() => {
          setGoldConfig(config);
        });
      }),
    []
  );

  const selectedServer = servers.find((server) => server.id === selectedServerId);
  const serverSelected = selectedServerId !== "";
  const factionSelected = selectedFaction !== "";
  const goldUnlocked = serverSelected && factionSelected;
  const safeGoldAmount = Math.min(
    Math.max(goldAmount, goldConfig.minGold),
    goldConfig.maxGold
  );
  const detailsUnlocked = goldUnlocked && safeGoldAmount >= goldConfig.minGold;
  const formReady =
    detailsUnlocked &&
    nickname.trim() !== "" &&
    deliveryMethod.trim() !== "" &&
    email.trim() !== "";
  const price = (safeGoldAmount / 1000) * goldConfig.pricePerThousand;
  const selectionModeLabel =
    goldSelectionModes.find((mode) => mode.id === goldConfig.selectionMode)?.label ??
    goldSelectionModes[0].label;

  return (
    <aside className="rounded-[1.75rem] border border-white/8 bg-[#0c1324] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.35)]">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
        Buy menu
      </p>
      <h2 className="mt-4 text-3xl font-black">Configure your order</h2>

      <div className="mt-8 space-y-6">
        <div className="rounded-[1.25rem] border border-white/8 bg-white/4 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Product
          </p>
          <p className="mt-2 text-lg font-black">{gameTitle}</p>
          <p className="mt-1 text-sm text-slate-400">{categoryTitle}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Modo: {selectionModeLabel}
          </p>
        </div>

        <div>
          <label
            htmlFor="server-select"
            className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
          >
            Server
          </label>
          <select
            id="server-select"
            value={selectedServerId}
            onChange={(event) => {
              setSelectedServerId(event.target.value);
              setSelectedFaction("");
              setGoldAmount(goldConfig.minGold);
              setNickname("");
              setDeliveryMethod("Face to face");
              setEmail("");
            }}
            className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30"
          >
            <option value="" className="bg-slate-950">
              Select a server
            </option>
            {servers.map((server) => (
              <option key={server.id} value={server.id} className="bg-slate-950">
                {server.name} ({server.region})
              </option>
            ))}
          </select>
        </div>

        <div className={!serverSelected ? "opacity-40" : ""}>
          <p
            className={`text-xs font-bold uppercase tracking-[0.18em] ${
              serverSelected ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Faction
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(selectedServer?.factions ?? ["Horde", "Alliance"]).map((faction) => (
              <button
                key={faction}
                type="button"
                disabled={!serverSelected}
                onClick={() => setSelectedFaction(faction)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedFaction === faction
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                } ${!serverSelected ? "cursor-not-allowed" : ""}`}
              >
                {faction}
              </button>
            ))}
          </div>
        </div>

        <div className={!goldUnlocked ? "opacity-40" : ""}>
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                goldUnlocked ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Gold amount
            </p>
            <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
              {safeGoldAmount.toLocaleString()} gold
            </span>
          </div>

          <input
            type="range"
            min={goldConfig.minGold}
            max={goldConfig.maxGold}
            step={goldConfig.goldStep}
            value={safeGoldAmount}
            disabled={!goldUnlocked}
            onChange={(event) => setGoldAmount(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300 disabled:cursor-not-allowed"
          />

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>{goldConfig.minGold.toLocaleString()}</span>
            <span>{goldConfig.maxGold.toLocaleString()}</span>
          </div>

          {goldUnlocked ? (
            <div className="mt-4 rounded-[1rem] border border-white/8 bg-white/4 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Price
              </p>
              <p className="mt-2 text-3xl font-black">${price}</p>
              <p className="mt-2 text-sm text-slate-400">
                ${goldConfig.pricePerThousand} per 1,000 gold
              </p>
            </div>
          ) : null}
        </div>

        <div className={`grid gap-4 ${!detailsUnlocked ? "opacity-40" : ""}`}>
          <div>
            <label
              htmlFor="nickname"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                detailsUnlocked ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              disabled={!detailsUnlocked}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Your character name"
              className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/30 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="delivery-method"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                detailsUnlocked ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Delivery method
            </label>
            <select
              id="delivery-method"
              value={deliveryMethod}
              disabled={!detailsUnlocked}
              onChange={(event) => setDeliveryMethod(event.target.value)}
              className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30 disabled:cursor-not-allowed"
            >
              {["Face to face", "Auction House", "Mailbox"].map((method) => (
                <option key={method} value={method} className="bg-slate-950">
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="email"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                detailsUnlocked ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled={!detailsUnlocked}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/30 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-cyan-300/15 bg-cyan-300/8 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                Selected server
              </p>
              <p className="mt-2 text-lg font-black">
                {selectedServer?.name ?? "No server selected"}
              </p>
            </div>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
              {selectedServer?.region ?? "--"} / {selectedFaction || "--"}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={!formReady}
          className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          Continue
        </button>
      </div>
    </aside>
  );
}
