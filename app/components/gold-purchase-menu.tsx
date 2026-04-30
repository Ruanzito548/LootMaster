"use client";

import { startTransition, useEffect, useState } from "react";

import { defaultGoldConfigEntry, emptyGoldConfig, getGoldConfigFor } from "../data/gold-config";
import type { GameServer } from "../data/games";
import { subscribeToGoldConfig } from "../../lib/gold-config";

type GoldPurchaseMenuProps = {
  gameId: string;
  gameTitle: string;
  categoryTitle: string;
  servers: GameServer[];
};

type PaymentMethod = "pix" | "card" | "balance";

const paymentMethods: Array<{
  id: PaymentMethod;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    id: "pix",
    title: "Pix",
    description: "Instant confirmation with 5% discount.",
    accent: "text-[#7fffd4]",
  },
  {
    id: "card",
    title: "Credit card",
    description: "Fast approval with parcel-friendly checkout.",
    accent: "text-[#8dd0ff]",
  },
  {
    id: "balance",
    title: "LM Coins",
    description: "Use your internal balance with zero gateway fee.",
    accent: "text-[#ffcf57]",
  },
];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function GoldPurchaseMenu({
  gameId,
  gameTitle,
  categoryTitle,
  servers,
}: GoldPurchaseMenuProps) {
  const isTbc = gameId === "tbc-anniversary";
  const isMidnight = gameId === "retail";
  const isClassic = gameId === "classic-era";
  const isPandaria = gameId === "mist-of-pandaria";
  const [fullGoldConfig, setFullGoldConfig] = useState(emptyGoldConfig);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [goldAmount, setGoldAmount] = useState(defaultGoldConfigEntry.minGold);
  const [nickname, setNickname] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("Face to face");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const hasServerOptions = servers.length > 0;

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
  const serverSelected = !hasServerOptions || selectedServerId !== "";
  const factionSelected = !hasServerOptions || selectedFaction !== "";
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
    email.trim() !== "" &&
    paymentMethod.trim() !== "";
  const price = (safeGoldAmount / 1000) * goldConfig.pricePerThousand;
  const paymentAdjustment =
    paymentMethod === "pix" ? price * -0.05 : paymentMethod === "card" ? price * 0.04 : 0;
  const finalPrice = Math.max(0, price + paymentAdjustment);
  const selectionModeLabel = hasServerOptions
    ? "Game -> Server -> Faction"
    : "Game";
  const selectedPayment = paymentMethods.find((method) => method.id === paymentMethod) ?? paymentMethods[0];

  const startCheckout = async () => {
    if (!formReady || checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          gameTitle,
          categoryTitle,
          goldAmount: safeGoldAmount,
          pricePerThousand: goldConfig.pricePerThousand,
          paymentMethod,
          nickname: nickname.trim(),
          serverId: selectedServerId,
          server: selectedServer?.name ?? "",
          faction: selectedFaction,
          deliveryMethod,
          email: email.trim(),
          hasServerOptions,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setCheckoutError(data.error ?? "Could not start checkout. Try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setCheckoutError("Network error. Check your connection and try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <aside className={`loot-panel rounded-[1.75rem] p-6 ${isTbc ? "tbc-panel" : isMidnight ? "midnight-panel" : isClassic ? "classic-panel" : isPandaria ? "pandaria-panel" : ""}`}>
      <p className={`text-sm font-bold uppercase tracking-[0.24em] ${isTbc ? "tbc-kicker" : isMidnight ? "midnight-kicker" : isClassic ? "classic-kicker" : isPandaria ? "pandaria-kicker" : "loot-kicker"}`}>
        Buy menu
      </p>
      <h2 className={`mt-4 text-3xl font-black ${isTbc ? "tbc-title" : isMidnight ? "midnight-title" : isClassic ? "classic-title" : isPandaria ? "pandaria-title" : "loot-title"}`}>
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
            Mode: {selectionModeLabel}
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
            disabled={!hasServerOptions}
            onChange={(event) => {
              const nextServerId = event.target.value;
              const nextConfig = getGoldConfigFor(fullGoldConfig, gameId, nextServerId, undefined);
              setSelectedServerId(nextServerId);
              setSelectedFaction("");
              setGoldAmount(nextConfig.minGold);
              setNickname("");
              setDeliveryMethod("Face to face");
              setEmail("");
            }}
            className="loot-select mt-3 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed"
          >
            <option value="">
              {hasServerOptions ? "Select a server" : "No server selection for this game"}
            </option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.region})
              </option>
            ))}
          </select>
        </div>

        <div className={!hasServerOptions || !serverSelected ? "opacity-40" : ""}>
          <p
            className={`text-xs font-bold uppercase tracking-[0.18em] ${
              hasServerOptions && serverSelected ? "text-[#a89a7b]" : "text-[#5e6470]"
            }`}
          >
            Faction
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(selectedServer?.factions ?? ["Horde", "Alliance"]).map((faction) => (
              <button
                key={faction}
                type="button"
                disabled={!hasServerOptions || !serverSelected}
                onClick={() => {
                  setSelectedFaction(faction);
                  const nextConfig = getGoldConfigFor(fullGoldConfig, gameId, selectedServerId, faction);
                  setGoldAmount(nextConfig.minGold);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedFaction === faction
                    ? isTbc
                      ? "tbc-gold-button"
                      : isMidnight
                      ? "midnight-gold-button"
                      : isClassic
                      ? "classic-gold-button"
                      : isPandaria
                      ? "pandaria-gold-button"
                      : "loot-gold-button"
                    : "loot-secondary-button border px-4 py-2 text-[#f8eed4]"
                } ${!hasServerOptions || !serverSelected ? "cursor-not-allowed" : ""}`}
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
                : isMidnight
                ? "rounded-full bg-[#1d4d80]/25 text-[#dff3ff]"
                : isClassic
                ? "rounded-full bg-[#7c4f28]/28 text-[#ffe7c6]"
                : isPandaria
                ? "rounded-full bg-[#1f6f55]/28 text-[#ddfff0]"
                : "rounded-full bg-[linear-gradient(180deg,#ffe27c_0%,#f7ba2c_65%,#cc7a15_100%)] text-[#2f1405]"} px-3 py-1 text-xs font-bold`}>
                {safeGoldAmount.toLocaleString()} gold
              </span>
            )}
          </div>
          <input
            type="range"
            min={goldConfig.minGold}
            max={goldConfig.maxGold}
            step={Math.max(1, goldConfig.minGold)}
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
                isTbc
                  ? "border-[#99ff99]/20"
                  : isMidnight
                  ? "border-[#4dc6ff]/20"
                  : isClassic
                  ? "border-[#f1c686]/24"
                  : isPandaria
                  ? "border-[#8df0c8]/24"
                  : "border-[#ffd76a]/10 bg-white/4"
              }`}
              style={
                isTbc
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/wow/wow-tbc/tbc-gold.jpeg")',
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : isMidnight
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/wow/wow-retail/midnight-gold.jpeg")',
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : isClassic
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("/wow/wow-classic-era/classic-era-gold.png")',
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : isPandaria
                  ? {
                      backgroundImage:
                        'linear-gradient(rgba(0, 0, 0, 0.46), rgba(0, 0, 0, 0.46)), url("/wow/wow-pandaria/pandaria-gold.png")',
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

        <div className={!detailsUnlocked ? "opacity-40" : ""}>
          <p
            className={`text-xs font-bold uppercase tracking-[0.18em] ${
              detailsUnlocked ? "text-[#a89a7b]" : "text-[#5e6470]"
            }`}
          >
            Payment method
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                disabled={!detailsUnlocked}
                onClick={() => setPaymentMethod(method.id)}
                className={`rounded-[1.1rem] border px-4 py-4 text-left transition-all ${
                  paymentMethod === method.id
                    ? "border-[#ffd76a]/40 bg-[#14273f] shadow-[0_16px_32px_rgba(5,10,20,0.22)]"
                    : "border-[#ffffff12] bg-[#0b1320]/70 hover:border-[#84d5ff]/24 hover:bg-[#101b2c]"
                } disabled:cursor-not-allowed`}
              >
                <p className={`text-sm font-black ${method.accent}`}>{method.title}</p>
                <p className="mt-2 text-xs leading-6 text-[#a7b6cb]">{method.description}</p>
              </button>
            ))}
          </div>

          {detailsUnlocked ? (
            <div className="mt-4 rounded-[1rem] border border-[#ffffff12] bg-[#08111f]/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9dd3ff]">Checkout summary</p>
                  <p className="mt-2 text-sm text-[#d9eaff]">
                    {selectedPayment.title} selected for {gameTitle} / {categoryTitle}.
                  </p>
                </div>
                <span className={`rounded-full border border-[#ffffff12] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${selectedPayment.accent}`}>
                  {selectedPayment.title}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[#c7d7eb]">
                <div className="flex items-center justify-between gap-3">
                  <span>Base price</span>
                  <span className="font-semibold">{formatBRL(price)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{paymentMethod === "pix" ? "Pix discount" : paymentMethod === "card" ? "Gateway fee" : "Balance adjustment"}</span>
                  <span className={`font-semibold ${paymentAdjustment <= 0 ? "text-[#89f0be]" : "text-[#ffd5a3]"}`}>
                    {paymentAdjustment === 0 ? formatBRL(0) : `${paymentAdjustment > 0 ? "+" : "-"}${formatBRL(Math.abs(paymentAdjustment))}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#ffffff12] pt-3 text-base">
                  <span className="font-bold text-[#f4e8c8]">Total</span>
                  <span className="text-lg font-black text-[#ffcf57]">{formatBRL(finalPrice)}</span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-6 text-[#94a7c3]">
                {paymentMethod === "pix"
                  ? "Pix orders are prioritized and can be confirmed instantly after payment."
                  : paymentMethod === "card"
                  ? "Card checkout can support installments once the gateway is connected."
                  : "LM Coins uses your internal wallet before any external payment is required."}
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
            <span className={`${isTbc ? "tbc-badge" : isMidnight ? "midnight-badge" : isClassic ? "classic-badge" : isPandaria ? "pandaria-badge" : "loot-badge-blue"} rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]`}>
              {selectedServer?.region ?? "--"} / {selectedFaction || "--"}
            </span>
          </div>
        </div>

        {checkoutError ? (
          <p className="rounded-xl border border-[#ff6060]/30 bg-[#1e0a0a]/70 px-4 py-3 text-sm font-semibold text-[#ff9898]">
            {checkoutError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!formReady || checkoutLoading}
          onClick={() => void startCheckout()}
          className={`${isTbc ? "tbc-gold-button" : isMidnight ? "midnight-gold-button" : isClassic ? "classic-gold-button" : isPandaria ? "pandaria-gold-button" : "loot-gold-button"} w-full rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200`}
        >
          {checkoutLoading
            ? "Redirecting to checkout..."
            : paymentMethod === "pix"
            ? `Pay with Pix — ${formatBRL(finalPrice)}`
            : paymentMethod === "card"
            ? `Pay with card — ${formatBRL(finalPrice)}`
            : `Pay with LM Coins — ${formatBRL(finalPrice)}`}
        </button>
      </div>
    </aside>
  );
}
