"use client";

import { useMemo, useState } from "react";

import { getAccountsByGameId, type AccountListing } from "../data/accounts";

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

export function AccountsMarket({ gameId, gameTitle }: AccountsMarketProps) {
  const listings = useMemo(() => getAccountsByGameId(gameId), [gameId]);

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
    <section className="loot-panel rounded-[1.75rem] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="loot-kicker text-sm font-bold uppercase tracking-[0.24em]">Accounts market</p>
          <h2 className="loot-title mt-3 text-3xl font-black">{gameTitle}</h2>
        </div>
        <p className="text-sm text-[#cdb991]">{filteredListings.length} resultados</p>
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
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filteredListings.map((account) => (
            <article key={account.id} className="rounded-[1.25rem] border border-[#ffd76a]/12 bg-white/4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="loot-title text-2xl font-black">{account.title}</h3>
                  <p className="mt-2 text-sm text-[#cdb991]">
                    {account.serverName} / {account.faction}
                  </p>
                </div>
                <span className="loot-badge-blue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                  Lv {account.level}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-[#ffd76a]/10 bg-black/20 px-3 py-2">
                  <p className="text-[#7d8597]">Race</p>
                  <p className="font-semibold text-[#f8eed4]">{account.race}</p>
                </div>
                <div className="rounded-xl border border-[#ffd76a]/10 bg-black/20 px-3 py-2">
                  <p className="text-[#7d8597]">Class</p>
                  <p className="font-semibold text-[#f8eed4]">{account.className}</p>
                </div>
                <div className="rounded-xl border border-[#ffd76a]/10 bg-black/20 px-3 py-2">
                  <p className="text-[#7d8597]">Price</p>
                  <p className="font-semibold text-[#f8eed4]">${account.price}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {account.highlights.map((highlight) => (
                  <span
                    key={`${account.id}-${highlight}`}
                    className="rounded-full border border-[#84d5ff]/18 bg-[#0d3f7a]/35 px-3 py-1 text-xs font-semibold text-[#d8f4ff]"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.25rem] border border-[#ffd76a]/12 bg-black/20 p-5">
          <p className="text-sm font-semibold text-[#f8eed4]">Nenhuma conta encontrada com esse filtro.</p>
        </div>
      )}
    </section>
  );
}
