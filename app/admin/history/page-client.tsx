"use client";

import Link from "next/link";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Search, Shield, SlidersHorizontal, TableProperties } from "lucide-react";
import type { User } from "firebase/auth";

import { ActivityLogTable } from "@/app/components/history/activity-log-table";
import type { ActivityCategory, ActivityHistoryLog, ActivityStatus } from "@/lib/activity-history-types";
import { useProfileSession } from "@/app/profile/use-profile-session";

const PAGE_SIZE = 30;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchAdminHistoryPage(input: {
  user: User | null;
  cursor?: string | null;
  userUid?: string;
  category?: string;
  actionType?: string;
  status?: string;
}) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Sua sessao ainda nao esta pronta. Aguarde alguns segundos e tente novamente.");
  }

  const url = new URL("/api/admin/history", window.location.origin);
  url.searchParams.set("limit", String(PAGE_SIZE));

  if (input.cursor) url.searchParams.set("cursor", input.cursor);
  if (input.userUid) url.searchParams.set("userUid", input.userUid);
  if (input.category && input.category !== "all") url.searchParams.set("category", input.category);
  if (input.actionType && input.actionType !== "all") url.searchParams.set("actionType", input.actionType);
  if (input.status && input.status !== "all") url.searchParams.set("status", input.status);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: string;
    items?: ActivityHistoryLog[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Nao foi possivel carregar o historico admin.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function normalizeSearch(item: ActivityHistoryLog) {
  return [
    item.reference,
    item.userUid,
    item.description,
    item.itemName,
    item.origin,
    item.actionType,
    item.relatedUserName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AdminHistoryClient() {
  const { status: sessionStatus, user } = useProfileSession();
  const [items, setItems] = useState<ActivityHistoryLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userUid, setUserUid] = useState("");
  const [category, setCategory] = useState<"all" | ActivityCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search);

  const actionTypeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.actionType)))];
  }, [items]);

  const reload = useCallback(async () => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!user) {
      setLoading(false);
      setErrorMessage("Voce precisa estar autenticado para acessar o historico admin.");
      setItems([]);
      setNextCursor(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const page = await fetchAdminHistoryPage({
        user,
        userUid: userUid.trim(),
        category,
        actionType: typeFilter,
        status: statusFilter,
      });

      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel carregar o historico admin.");
    } finally {
      setLoading(false);
    }
  }, [category, sessionStatus, statusFilter, typeFilter, user, userUid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!loadMoreRef.current || !nextCursor || loadingMore || loading) {
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
            const page = await fetchAdminHistoryPage({
              user,
              cursor: nextCursor,
              userUid: userUid.trim(),
              category,
              actionType: typeFilter,
              status: statusFilter,
            });

            startTransition(() => {
              setItems((current) => {
                const merged = [...current, ...page.items];
                return Array.from(new Map(merged.map((item) => [item.id, item])).values());
              });
              setNextCursor(page.nextCursor);
            });
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel carregar mais linhas do historico admin.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [category, loading, loadingMore, nextCursor, statusFilter, typeFilter, user, userUid]);

  const filteredItems = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) => normalizeSearch(item).includes(normalized));
  }, [deferredSearch, items]);

  const suspiciousCount = useMemo(() => {
    return items.filter((item) => item.status === "failed" || item.status === "rejected").length;
  }, [items]);

  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="flex w-full flex-1 flex-col gap-6 pb-20 pt-12">
        <section className="rounded-[2rem] border border-green-900 bg-green-950/20 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-green-600">Admin</p>
              <h1 className="mt-3 text-4xl font-black text-green-300 sm:text-5xl">Tabela Global de Historico</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-green-600">
                Visao compacta em formato planilha com usuarios, referencias de transacao, acoes administrativas e movimentos suspeitos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-green-900 bg-black/20 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-green-600">Linhas carregadas</p>
                <p className="mt-2 text-2xl font-black text-green-300">{items.length}</p>
              </div>
              <div className="rounded-2xl border border-green-900 bg-black/20 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-green-600">Linhas visiveis</p>
                <p className="mt-2 text-2xl font-black text-green-300">{filteredItems.length}</p>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-rose-200">Suspeitas</p>
                <p className="mt-2 text-2xl font-black text-rose-100">{suspiciousCount}</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-500/20 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-green-900 bg-green-950/20 p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-green-700" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario, referencia, item, acao"
                className="w-full rounded-xl border border-green-900 bg-black/30 py-3 pl-10 pr-4 text-sm text-green-100 outline-none focus:border-green-700"
              />
            </label>

            <input
              value={userUid}
              onChange={(event) => setUserUid(event.target.value)}
              placeholder="Filtrar por UID do usuario"
              className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700"
            />

            <select value={category} onChange={(event) => setCategory(event.target.value as "all" | ActivityCategory)} className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700">
              <option value="all">Todas as categorias</option>
              <option value="economy">Economia</option>
              <option value="marketplace">Marketplace</option>
              <option value="inventory">Inventario</option>
              <option value="chests">Abertura de Bau</option>
              <option value="crafting">Crafting</option>
              <option value="admin">Admin</option>
              <option value="progression">Progressao</option>
            </select>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700">
              <option value="all">Todas as acoes</option>
              {actionTypeOptions.filter((option) => option !== "all").map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ActivityStatus)} className="rounded-xl border border-green-900 bg-black/30 px-3 py-3 text-sm text-green-100 outline-none focus:border-green-700">
              <option value="all">Todos os status</option>
              <option value="completed">Concluido</option>
              <option value="consumed">Consumido</option>
              <option value="admin_action">Acao Admin</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
              <option value="failed">Falhou</option>
              <option value="cancelled">Cancelado</option>
              <option value="system">System</option>
            </select>

            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-700 bg-green-950 px-4 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Aplicar
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-green-600">
              <TableProperties className="h-4 w-4" />
              Modo planilha admin
            </div>
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              Linhas com falha e rejeicao destacadas pelo status
            </div>
          </div>

          <div className="mt-5">
            <ActivityLogTable items={filteredItems} loadingMore={loadingMore} emptyLabel="Nenhum log admin corresponde aos filtros atuais." showUserColumn />
          </div>

          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
              {nextCursor ? "Role para carregar mais linhas" : "Sem mais linhas"}
            </span>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin" className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950">
            Voltar para admin
          </Link>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-green-950 px-5 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-900">
            <Shield className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
