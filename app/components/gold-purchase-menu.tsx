"use client";

import { startTransition, useEffect, useState } from "react";

import { defaultGoldConfig, getGoldConfigFor, goldSelectionModes } from "../data/gold-config";
import type { GameServer } from "../data/games";
import { subscribeToGoldConfig } from "../../lib/gold-config";

type GoldPurchaseMenuProps = {
  gameId: string;
  gameTitle: string;
  categoryTitle: string;
  servers: GameServer[];
};

export function GoldPurchaseMenu({
  gameId,
  gameTitle,
  categoryTitle,
  servers,
}: GoldPurchaseMenuProps) {
  const isTbc = gameId === "tbc-anniversary";
  const isMidnight = gameId === "retail";
  const [fullGoldConfig, setFullGoldConfig] = useState(defaultGoldConfig);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [goldAmount, setGoldAmount] = useState(defaultGoldConfig.default.minGold);
  const [nickname, setNickname] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Face to face");
  const [email, setEmail] = useState("");

  useEffect(
    () =>
      subscribeToGoldConfig((config) => {
        startTransition(() => {
          setFullGoldConfig(config);
        });
      }),
    []
  );

  const goldConfig = getGoldConfigFor(fullGoldConfig, gameId, selectedServerId, selectedFaction);

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
  const selectionModeLabel = "Jogo -> Servidor -> Faccao";

  return (
    <aside className={`loot-panel rounded-[1.75rem] p-6 ${isTbc ? "tbc-panel" : ""}`}>
      <p className={`text-sm font-bold uppercase tracking-[0.24em] ${isTbc ? "tbc-kicker" : "loot-kicker"}`}>
        Buy menu
      </p>
      <h2 className={`mt-4 text-3xl font-black ${isTbc ? "tbc-title" : "loot-title"}`}>
        Configure your order
      </h2>

      <div className="mt-8 space-y-6">
        <div className="rounded-[1.25rem] border border-[#ffd76a]/10 bg-white/4 p-4">
          <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
            Product
          </p>
          <p className="loot-title mt-2 text-lg font-black">{gameTitle}</p>
          <p className="loot-muted mt-1 text-sm">{categoryTitle}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff]">
            Modo: {selectionModeLabel}
          </p>
        </div>

        <div>
          <label
            htmlFor="server-select"
            className="loot-label text-xs font-bold uppercase tracking-[0.18em]"
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
            className="loot-select mt-3 px-4 py-3 text-sm font-semibold"
          >
            <option value="">
              Select a server
            </option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.region})
              </option>
            ))}
          </select>
        </div>

        <div className={!serverSelected ? "opacity-40" : ""}>
          <p
            className={`text-xs font-bold uppercase tracking-[0.18em] ${
              serverSelected ? "text-[#a89a7b]" : "text-[#5e6470]"
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
                    ? isTbc
                      ? "tbc-gold-button"
                      : "loot-gold-button"
                    : "loot-secondary-button border px-4 py-2 text-[#f8eed4]"
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
                goldUnlocked ? "text-[#a89a7b]" : "text-[#5e6470]"
              }`}
            >
              Gold amount
            </p>
            {goldUnlocked && (
              <span className={`${isTbc
                ? "rounded-full bg-[#2f733e]/20 text-[#d2f5c2]"
                : "rounded-full bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] text-[#2f1405]"} px-3 py-1 text-xs font-bold`}>
                {safeGoldAmount.toLocaleString()} gold
              </span>
            )}
          </div>
          <input
            type="range"
            min={goldConfig.minGold}
            max={goldConfig.maxGold}
            step={goldConfig.goldStep}
            value={safeGoldAmount}
            disabled={!goldUnlocked}
            onChange={(event) => setGoldAmount(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#f7ba2c] disabled:cursor-not-allowed"
          />

          <div className="mt-2 flex justify-between text-xs text-[#7d8597]">
            <span>{goldConfig.minGold.toLocaleString()}</span>
            <span>{goldConfig.maxGold.toLocaleString()}</span>
          </div>

          {goldUnlocked ? (
            <div
              className={`mt-4 rounded-[1rem] border p-4 ${
                isTbc ? "border-[#99ff99]/20" : isMidnight ? "border-[#4dc6ff]/20" : "border-[#ffd76a]/10 bg-white/4"
              }`}
              style={
                isTbc
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/goldtbc.jpeg")',
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : isMidnight
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/midnightgold.jpeg")',
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <p className="loot-label text-xs font-bold uppercase tracking-[0.18em]">
                Price
              </p>
              <p className="loot-title mt-2 text-3xl font-black">${price}</p>
              <p className="loot-muted mt-2 text-sm">
                ${goldConfig.pricePerThousand} per 1,000 gold
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div>
            <label
              htmlFor="nickname"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                detailsUnlocked ? "text-[#a89a7b]" : "text-[#5e6470]"
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
              className="loot-input mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="delivery-method"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                detailsUnlocked ? "text-[#a89a7b]" : "text-[#5e6470]"
              }`}
            >
              Delivery method
            </label>
            <select
              id="delivery-method"
              value={deliveryMethod}
              disabled={!detailsUnlocked}
              onChange={(event) => setDeliveryMethod(event.target.value)}
              className="loot-select mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {["Face to face", "Auction House", "Mailbox"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="email"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                detailsUnlocked ? "text-[#a89a7b]" : "text-[#5e6470]"
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
              className="loot-input mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#84d5ff]/18 bg-[#0d3f7a]/24 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8f4ff]">
                Selected server
              </p>
              <p className="loot-title mt-2 text-lg font-black">
                {selectedServer?.name ?? "No server selected"}
              </p>
            </div>
            <span className={`${isTbc ? "tbc-badge" : "loot-badge-blue"} rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]`}>
              {selectedServer?.region ?? "--"} / {selectedFaction || "--"}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={!formReady}
          className={`${isTbc ? "tbc-gold-button" : "loot-gold-button"} w-full rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200`}
        >
          Continue
        </button>
      </div>
    </aside>
  );
}
