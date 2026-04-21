"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type { AccountListing } from "../data/accounts";
import { subscribeToAccountsMarket } from "../../lib/accounts-market";

type AccountsMarketProps = {
  gameId: string;
  gameTitle: string;
};

type PriceFilter = "all" | "0-100" | "100-150" | "150+";

function inPriceRange(price: number, range: PriceFilter): boolean {
  if (range === "all") return true;
  if (range === "0-100") return price <= 100;
  if (range === "100-150") return price > 100 && price <= 150;
  return price > 150;
}

function getAccountBackgroundImage(account: AccountListing): string | null {
  if (account.race === "Orc" && account.className === "Warrior") {
    return "/race-classe/orc-male-warrior.png";
  }

  if (account.race === "Blood Elf" && account.className === "Paladin") {
    return "/race-classe/belf-male-paladin.png";
  }

  return null;
}

export function AccountsMarket({ gameId, gameTitle }: AccountsMarketProps) {
  const isTbc = gameId === "tbc-anniversary";
  const isClassic = gameId === "classic-era";
  const isPandaria = gameId === "mist-of-pandaria";
  const [listings, setListings] = useState<AccountListing[]>([]);

  useEffect(
    () =>
      subscribeToAccountsMarket(gameId, (nextListings) => {
        startTransition(() => setListings(nextListings));
      }),
    [gameId]
  );

  const [serverFilter, setServerFilter] = useState("all");
  const [raceFilter, setRaceFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

  const serverOptions = useMemo(
    () => Array.from(new Set(listings.map((item) => item.serverName))),
    [listings]
  );
  const raceOptions = useMemo(
    () => Array.from(new Set(listings.map((item) => item.race))),
    [listings]
  );
  const classOptions = useMemo(
    () => Array.from(new Set(listings.map((item) => item.className))),
    [listings]
  );

  const filteredListings = useMemo(
    () =>
      listings.filter((item) => {
        const serverMatch = serverFilter === "all" || item.serverName === serverFilter;
        const raceMatch = raceFilter === "all" || item.race === raceFilter;
        const classMatch = classFilter === "all" || item.className === classFilter;
        const priceMatch = inPriceRange(item.price, priceFilter);
        return serverMatch && raceMatch && classMatch && priceMatch;
      }),
    [listings, serverFilter, raceFilter, classFilter, priceFilter]
  );

  return (
    <section className={`loot-panel rounded-[1.75rem] p-6 ${isTbc ? "tbc-panel" : isClassic ? "classic-panel" : isPandaria ? "pandaria-panel" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-sm font-bold uppercase tracking-[0.24em] ${isTbc ? "tbc-kicker" : isClassic ? "classic-kicker" : isPandaria ? "pandaria-kicker" : "loot-kicker"}`}>Accounts market</p>
          <h2 className={`mt-3 text-3xl font-black ${isTbc ? "tbc-title" : isClassic ? "classic-title" : isPandaria ? "pandaria-title" : "loot-title"}`}>{gameTitle}</h2>
        </div>
        <p className={`text-sm ${isTbc ? "tbc-muted" : isClassic ? "classic-muted" : isPandaria ? "pandaria-muted" : "text-[#cdb991]"}`}>{filteredListings.length} resultados</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
          Server
          <select
            value={serverFilter}
            onChange={(event) => setServerFilter(event.target.value)}
            className="loot-select px-4 py-3 text-sm font-semibold"
          >
            <option value="all">All servers</option>
            {serverOptions.map((server) => (
              <option key={server} value={server}>
                {server}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
          Race
          <select
            value={raceFilter}
            onChange={(event) => setRaceFilter(event.target.value)}
            className="loot-select px-4 py-3 text-sm font-semibold"
          >
            <option value="all">All races</option>
            {raceOptions.map((race) => (
              <option key={race} value={race}>
                {race}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
          Class
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="loot-select px-4 py-3 text-sm font-semibold"
          >
            <option value="all">All classes</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a89a7b]">
          Prices
          <select
            value={priceFilter}
            onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
            className="loot-select px-4 py-3 text-sm font-semibold"
          >
            <option value="all">All prices</option>
            <option value="0-100">$0 - $100</option>
            <option value="100-150">$101 - $150</option>
            <option value="150+">$151+</option>
          </select>
        </label>
      </div>

      {filteredListings.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {filteredListings.map((account) => (
            <article
              key={account.id}
              className={`group relative overflow-hidden rounded-[1.25rem] border transition-all duration-300 transform-gpu hover:-translate-y-1 hover:scale-[1.03] ${isTbc ? "border-[#99ff99]/20 hover:border-[#99ff99]/35 hover:shadow-[0_16px_34px_rgba(50,170,90,0.28)]" : "border-[#ffd76a]/12 hover:border-[#ffd76a]/28 hover:shadow-[0_16px_34px_rgba(247,186,44,0.22)]"}`}
              style={(() => {
                const image = getAccountBackgroundImage(account);

                if (!image) {
                  return {
                    backgroundImage: isTbc
                      ? "linear-gradient(rgba(18, 52, 28, 0.9), rgba(18, 52, 28, 0.9))"
                      : isClassic
                      ? "linear-gradient(rgba(58, 36, 18, 0.9), rgba(58, 36, 18, 0.9))"
                      : isPandaria
                      ? "linear-gradient(rgba(10, 48, 36, 0.9), rgba(10, 48, 36, 0.9))"
                      : "linear-gradient(rgba(10, 28, 44, 0.86), rgba(10, 28, 44, 0.86))",
                  };
                }

                return {
                  backgroundImage: `url(${image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                };
              })()}
            >
              <div className={`absolute inset-0 transition-all duration-300 ${isTbc ? "bg-[#0a180f]/30 group-hover:bg-[#0a180f]/12" : isClassic ? "bg-[#1b120a]/30 group-hover:bg-[#1b120a]/12" : isPandaria ? "bg-[#062017]/30 group-hover:bg-[#062017]/12" : "bg-black/30 group-hover:bg-black/10"}`} />
              <div className="relative z-10 flex min-h-[30rem] flex-col justify-end bg-gradient-to-t from-black/45 via-black/12 to-transparent p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`text-2xl font-black ${isTbc ? "tbc-title" : isClassic ? "classic-title" : isPandaria ? "pandaria-title" : "loot-title"}`}>{account.title}</h3>
                    <p className={`mt-2 text-sm ${isTbc ? "tbc-muted" : isClassic ? "classic-muted" : isPandaria ? "pandaria-muted" : "text-[#cdb991]"}`}>
                      {account.serverName} / {account.faction}
                    </p>
                  </div>
                  <span className={`${isTbc ? "tbc-badge" : isClassic ? "classic-badge" : isPandaria ? "pandaria-badge" : "loot-badge-blue"} rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]`}>
                    Lv {account.level}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className={`rounded-xl border px-3 py-2 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : "border-[#ffd76a]/10 bg-black/20"}`}>
                    <p className={isTbc ? "text-[#8ccda0]" : "text-[#7d8597]"}>Race</p>
                    <p className={`font-semibold ${isTbc ? "text-[#e6ffe9]" : "text-[#f8eed4]"}`}>{account.race}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : "border-[#ffd76a]/10 bg-black/20"}`}>
                    <p className={isTbc ? "text-[#8ccda0]" : "text-[#7d8597]"}>Class</p>
                    <p className={`font-semibold ${isTbc ? "text-[#e6ffe9]" : "text-[#f8eed4]"}`}>{account.className}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : "border-[#ffd76a]/10 bg-black/20"}`}>
                    <p className={isTbc ? "text-[#8ccda0]" : "text-[#7d8597]"}>Price</p>
                    <p className={`font-semibold ${isTbc ? "text-[#e6ffe9]" : "text-[#f8eed4]"}`}>${account.price}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div className={`rounded-xl border px-3 py-2 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : "border-[#ffd76a]/10 bg-black/20"}`}>
                    <p className={isTbc ? "text-[#8ccda0]" : "text-[#7d8597]"}>Gender</p>
                    <p className={`font-semibold ${isTbc ? "text-[#e6ffe9]" : "text-[#f8eed4]"}`}>{account.gender}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : "border-[#ffd76a]/10 bg-black/20"}`}>
                    <p className={isTbc ? "text-[#8ccda0]" : "text-[#7d8597]"}>Prof 1</p>
                    <p className={`font-semibold ${isTbc ? "text-[#e6ffe9]" : "text-[#f8eed4]"}`}>{account.professionOne}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : "border-[#ffd76a]/10 bg-black/20"}`}>
                    <p className={isTbc ? "text-[#8ccda0]" : "text-[#7d8597]"}>Prof 2</p>
                    <p className={`font-semibold ${isTbc ? "text-[#e6ffe9]" : "text-[#f8eed4]"}`}>{account.professionTwo}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {account.highlights.map((highlight) => (
                    <span
                      key={`${account.id}-${highlight}`}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${isTbc ? "border-[#99ff99]/24 bg-[#173728]/65 text-[#d2f5c2]" : "border-[#84d5ff]/18 bg-[#0d3f7a]/35 text-[#d8f4ff]"}`}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={`mt-6 rounded-[1.25rem] border p-5 ${isTbc ? "border-[#99ff99]/20 bg-[#0b1c12]/70" : isClassic ? "border-[#f1c686]/20 bg-[#25190f]/70" : isPandaria ? "border-[#8df0c8]/20 bg-[#0d2a1f]/70" : "border-[#ffd76a]/12 bg-black/20"}`}>
          <p className={`text-sm font-semibold ${isTbc ? "text-[#d2f5c2]" : isClassic ? "text-[#ffe7c6]" : isPandaria ? "text-[#ddfff1]" : "text-[#f8eed4]"}`}>Nenhuma conta encontrada com esse filtro.</p>
        </div>
      )}
    </section>
  );
}
