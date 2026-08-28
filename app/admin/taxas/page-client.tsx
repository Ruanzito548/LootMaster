"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { useProfileSession } from "@/app/profile/use-profile-session";
import type { FeeTransferRow } from "./taxas-types";

const PAGE_SIZE = 50;

type SupportedCurrency = "USD" | "BRL" | "EUR";

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchTaxasPage(input: { user: User | null; cursor?: string | null }) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/taxas", window.location.origin);
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (input.cursor) {
    url.searchParams.set("cursor", input.cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = (await response.json()) as { error?: string; items?: FeeTransferRow[]; nextCursor?: string | null };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load fee transfers.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function normalizeCurrency(value: string): SupportedCurrency {
  const normalized = value.trim().toUpperCase();
  if (normalized === "BRL" || normalized === "EUR") {
    return normalized;
  }

  return "USD";
}

function getCurrencyLocale(currency: SupportedCurrency) {
  if (currency === "BRL") return "pt-BR";
  if (currency === "EUR") return "de-DE";
  return "en-US";
}

function formatMoney(cents: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

function buildSearchIndex(row: FeeTransferRow) {
  return [row.orderId, row.customerUid, row.customerEmail, row.agentUid, row.status, row.currency]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AdminTaxasClient() {
  const { status: sessionStatus, user } = useProfileSession();
  const [items, setItems] = useState<FeeTransferRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!user) {
      setItems([]);
      setNextCursor(null);
      setLoading(false);
      setErrorMessage("Sign in required to access fee transfers.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const page = await fetchTaxasPage({ user });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load fee transfers.");
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!loadMoreRef.current || !nextCursor || loading || loadingMore) {
      return;
    }

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        void (async () => {
          setLoadingMore(true);
          try {
            const page = await fetchTaxasPage({ user, cursor: nextCursor });
            setItems((current) => {
              const merged = [...current, ...page.items];
              return Array.from(new Map(merged.map((item) => [item.id, item])).values());
            });
            setNextCursor(page.nextCursor);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more fee transfers.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, nextCursor, user]);

  const filteredItems = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((row) => buildSearchIndex(row).includes(normalized));
  }, [deferredSearch, items]);

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Comissões de Parceiros</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-green-600">
              Registro paginado dos repasses reais por compra para parceiros e para a LootMaster.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-green-700">
              Carregamento incremental de {PAGE_SIZE} registros por vez.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clientes"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Clientes e parceiros
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Back to admin
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pedido, cliente, parceiro ou status"
            className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700"
          />
          <div className="rounded-xl border border-green-900 bg-black/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-green-600">
            Carregados: {items.length}
          </div>
          <div className="rounded-xl border border-green-900 bg-black/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-green-600">
            Visiveis: {filteredItems.length}
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
          {loading ? (
            <p className="px-5 py-4 text-sm text-green-600">Carregando comissões de parceiros...</p>
          ) : filteredItems.length === 0 ? (
            <p className="px-5 py-4 text-sm text-green-600">Nenhum registro de comissão encontrado.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Taxa total</th>
                  <th className="px-4 py-3">Parceiro</th>
                  <th className="px-4 py-3">Repasse do parceiro</th>
                  <th className="px-4 py-3">LootMaster</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row, index) => {
                  const currency = normalizeCurrency(row.currency);

                  return (
                    <tr key={row.id} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-green-300">{row.orderId}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-green-500">
                        <p>{row.customerUid ?? "--"}</p>
                        <p className="mt-1">{row.customerEmail || "--"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-green-300">{formatMoney(row.amountTotalCents, currency)}</td>
                      <td className="px-4 py-3 text-xs text-green-300">
                        {formatMoney(row.platformFeeCents, currency)} ({row.commissionPercent.toFixed(2)}%)
                      </td>
                      <td className="px-4 py-3 text-xs text-green-500">
                        {row.agentUid ? `${row.agentUid} (${row.agentFeeSharePercent.toFixed(2)}%)` : "Sem parceiro"}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-emerald-300">
                        {formatMoney(row.agentPayoutCents, currency)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-green-300">
                        {formatMoney(row.lootmasterFeeCents, currency)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-amber-300">
                        {row.status.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-green-500">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString("pt-BR") : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div ref={loadMoreRef} className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
            {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais registros"}
          </span>
        </div>
      </main>
    </div>
  );
}
