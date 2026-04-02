"use client";

import { useState } from "react";

import type { GameServer } from "../data/games";

type GoldPurchaseMenuProps = {
  gameTitle: string;
  categoryTitle: string;
  servers: GameServer[];
};

const GOLD_STEP = 1000;
const MIN_GOLD = 1000;
const MAX_GOLD = 10000;
const PRICE_PER_THOUSAND = 20;

export function GoldPurchaseMenu({
  gameTitle,
  categoryTitle,
  servers,
}: GoldPurchaseMenuProps) {
  const [selectedServerId, setSelectedServerId] = useState<string>(
    servers[0]?.id ?? ""
  );
  const [selectedFaction, setSelectedFaction] = useState<string>(
    servers[0]?.factions[0] ?? "Horde"
  );
  const [goldAmount, setGoldAmount] = useState<number>(3000);
  const [nickname, setNickname] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Face to face");
  const [email, setEmail] = useState("");

  const selectedServer =
    servers.find((server) => server.id === selectedServerId) ?? servers[0];
  const price = (goldAmount / 1000) * PRICE_PER_THOUSAND;

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
              const nextServer =
                servers.find((server) => server.id === event.target.value) ??
                servers[0];

              setSelectedServerId(event.target.value);
              setSelectedFaction(nextServer?.factions[0] ?? "Horde");
            }}
            className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30"
          >
            {servers.map((server) => (
              <option key={server.id} value={server.id} className="bg-slate-950">
                {server.name} ({server.region})
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Faction
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {selectedServer?.factions.map((faction) => (
              <button
                key={faction}
                type="button"
                onClick={() => setSelectedFaction(faction)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedFaction === faction
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                {faction}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Gold amount
            </p>
            <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
              {goldAmount.toLocaleString()} gold
            </span>
          </div>

          <input
            type="range"
            min={MIN_GOLD}
            max={MAX_GOLD}
            step={GOLD_STEP}
            value={goldAmount}
            onChange={(event) => setGoldAmount(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300"
          />

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>{MIN_GOLD.toLocaleString()}</span>
            <span>{MAX_GOLD.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label
              htmlFor="nickname"
              className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Your character name"
              className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/30"
            />
          </div>

          <div>
            <label
              htmlFor="delivery-method"
              className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Delivery method
            </label>
            <select
              id="delivery-method"
              value={deliveryMethod}
              onChange={(event) => setDeliveryMethod(event.target.value)}
              className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-300/30"
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
              className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="mt-3 w-full rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/30"
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
                {selectedServer?.name ?? "No server"}
              </p>
            </div>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
              {selectedServer?.region ?? "--"} / {selectedFaction}
            </span>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-white/8 bg-white/4 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Price
          </p>
          <p className="mt-2 text-4xl font-black">${price}</p>
          <p className="mt-2 text-sm text-slate-400">$20 per 1,000 gold</p>
        </div>

        <button
          type="button"
          className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
        >
          Continue
        </button>
      </div>
    </aside>
  );
}
