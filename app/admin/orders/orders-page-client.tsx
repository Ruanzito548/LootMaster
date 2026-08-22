"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { AlertTriangle, CalendarClock, CircleDollarSign, Download, RefreshCw, ShoppingCart } from "lucide-react";
import CreateTestOrderButton from "./create-test-order-button";
import type { OrderRow } from "./export-button";
import { OrdersTableWithActions } from "./orders-table";

const PAGE_SIZE = 50;

type OrdersStatusMode = "all" | "open" | "completed";

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

  const summary = useMemo(() => {
    const totalCents = rows.reduce((sum, row) => sum + row.totalCents, 0);
    const openOrders = rows.filter((row) => row.status !== "Completed").length;
    const pendingPayments = rows.filter((row) => row.status === "Unpaid").length;
    return {
      openOrders,
      totalCents,
      averageCents: rows.length > 0 ? Math.round(totalCents / rows.length) : 0,
      pendingPayments,
    };
  }, [rows]);

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
          setErrorMessage(null);
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
      <main className="mx-auto w-full max-w-7xl px-1 py-4 sm:px-2 lg:px-3">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/8 pb-5">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#d4af5a]">Extrato</p>
            <h1 className="mt-2 text-3xl font-black text-[#f0ede4] sm:text-4xl">
              {mode === "open" ? "Ordens Abertas" : mode === "completed" ? "Ordens Completas" : "Ordens"}
            </h1>
            <p className="mt-2 text-sm text-[#8e98a3]">
              {mode === "open"
                ? "Ordens pendentes ou pagas aguardando conclusao."
                : mode === "completed"
                  ? "Historico de ordens marcadas como concluidas."
                  : "Lista geral de ordens com filtros e acoes administrativas."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode !== "completed" ? <CreateTestOrderButton onCreated={reload} /> : null}
          </div>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            [ShoppingCart, "Ordens abertas", `${summary.openOrders}`, "Visíveis na tabela", "text-[#b98af0]"],
            [CircleDollarSign, "Valor total", `$${(summary.totalCents / 100).toFixed(2)}`, "Todas as ordens visíveis", "text-[#e6c46a]"],
            [CircleDollarSign, "Ticket médio", `$${(summary.averageCents / 100).toFixed(2)}`, "Por ordem", "text-[#72c8ff]"],
            [CalendarClock, "Pagamentos pendentes", `${summary.pendingPayments}`, "Aguardando confirmação", "text-[#45c982]"],
            [AlertTriangle, "Atrasadas", "N/A", "Sem SLA configurado", "text-[#e07a7a]"],
          ].map(([Icon, label, value, caption, tone]) => (
            <article key={String(label)} className="rounded-xl border border-white/8 bg-[#101722] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-3"><p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#8e98a3]">{String(label)}</p><Icon className={`size-4 ${String(tone)}`} /></div>
              <p className="mt-2 text-2xl font-black text-[#f0ede4]">{String(value)}</p>
              <p className="mt-1 text-[0.62rem] text-[#748092]">{String(caption)}</p>
            </article>
          ))}
        </section>

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
              {mode === "open" ? "Nenhuma ordem aberta." : mode === "completed" ? "Nenhuma ordem completa." : "Nenhuma ordem encontrada."}
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

        <div className="mt-5 grid gap-3 rounded-xl border border-white/8 bg-[#101722] p-3 text-[0.65rem] text-[#8e98a3] sm:grid-cols-3">
          <div className="flex items-center gap-2"><Download className="size-4 text-[#d4af5a]" /><span><strong className="text-[#e6c46a]">Exportação</strong><br />Use Export visible rows na tabela</span></div>
          <button type="button" onClick={() => void reload()} className="flex items-center gap-2 text-left hover:text-[#e6c46a]"><RefreshCw className="size-4 text-[#d4af5a]" /><span><strong className="text-[#e6c46a]">Atualização</strong><br />Atualizar dados agora</span></button>
          <div className="flex items-center gap-2"><CalendarClock className="size-4 text-[#d4af5a]" /><span><strong className="text-[#e6c46a]">Fuso horário</strong><br />America/Sao_Paulo (UTC-3)</span></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
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
