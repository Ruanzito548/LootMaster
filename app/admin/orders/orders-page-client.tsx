"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { useProfileSession } from "@/app/profile/use-profile-session";
import CreateTestOrderButton from "./create-test-order-button";
import type { OrderRow } from "./export-button";
import { OrdersTableWithActions } from "./orders-table";

const PAGE_SIZE = 50;

type OrdersStatusMode = "open" | "completed";

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchOrdersPage(input: {
  user: User | null;
  mode: OrdersStatusMode;
  cursor?: string | null;
}) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/orders", window.location.origin);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("status", input.mode);
  if (input.cursor) {
    url.searchParams.set("cursor", input.cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: string;
    items?: OrderRow[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load orders.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

export default function OrdersPageClient({ mode }: { mode: OrdersStatusMode }) {
  const { user, status } = useProfileSession();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    if (!user) {
      setRows([]);
      setNextCursor(null);
      setLoading(false);
      setErrorMessage("Sign in required to access orders.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const page = await fetchOrdersPage({ user, mode });
      setRows(page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [mode, status, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!loadMoreRef.current || !nextCursor || loading || loadingMore || !user) {
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
+          setErrorMessage(null);
          try {
            const page = await fetchOrdersPage({ user, mode, cursor: nextCursor });
            setRows((current) => {
              const merged = [...current, ...page.items];
              return Array.from(new Map(merged.map((item) => [item.id, item])).values());
            });
            setNextCursor(page.nextCursor);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more orders.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "260px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, mode, nextCursor, user]);

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Extrato</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">
              {mode === "open" ? "Ordens Abertas" : "Ordens Completas"}
            </h1>
            <p className="mt-2 text-sm text-green-600">
              {mode === "open"
                ? "Ordens pendentes ou pagas aguardando conclusao."
                : "Historico de ordens marcadas como concluidas."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {mode === "open" ? <CreateTestOrderButton onCreated={reload} /> : null}
          </div>
        </div>

        {errorMessage ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
          </section>
        ) : null}

        {loading ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm text-green-600">Carregando ordens...</p>
          </section>
        ) : rows.length === 0 ? (
          <section className="mt-6 overflow-x-auto rounded-xl border border-green-900 bg-black">
            <p className="px-5 py-4 text-sm text-green-600">
              {mode === "open" ? "Nenhuma ordem aberta." : "Nenhuma ordem completa."}
            </p>
          </section>
        ) : (
          <OrdersTableWithActions rows={rows} onReload={reload} />
        )}

        <div ref={loadMoreRef} className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
            {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais ordens"}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
          >
            Voltar ao admin
          </Link>
        </div>
      </main>
    </div>
  );
}
