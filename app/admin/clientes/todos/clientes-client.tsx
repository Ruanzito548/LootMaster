"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CircleHelp, Copy, Search, UserCheck, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { auth } from "@/lib/firebase";
import type { ClientRow } from "../clientes-types";

const PAGE_SIZE = 50;
const NEW_CLIENT_DAYS = 10;
const ACTIVE_CLIENT_DAYS = 30;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchClientsPage(input: { user: User | null; cursor?: string | null; search?: string }) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/clients", window.location.origin);
  url.searchParams.set("mode", "all");
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (input.search?.trim()) {
    url.searchParams.set("q", input.search.trim());
  }
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
    items?: ClientRow[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load clients.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getClientStatus(row: ClientRow): { label: "Novo" | "Ativo" | "Inativo"; tone: string } {
  const createdAt = parseDate(row.createdAt);
  const lastActivityAt = parseDate(row.lastActivityAt);
  const now = Date.now();
  const newThreshold = now - NEW_CLIENT_DAYS * 24 * 60 * 60 * 1000;
  const activeThreshold = now - ACTIVE_CLIENT_DAYS * 24 * 60 * 60 * 1000;

  if (lastActivityAt && lastActivityAt >= activeThreshold) {
    return { label: "Ativo", tone: "text-emerald-300 border-emerald-800 bg-emerald-950/20" };
  }

  if (createdAt && createdAt >= newThreshold) {
    return { label: "Novo", tone: "text-cyan-300 border-cyan-800 bg-cyan-950/20" };
  }

  return { label: "Inativo", tone: "text-rose-300 border-rose-800 bg-rose-950/20" };
}

function formatLastAccess(value: string | null | undefined): string {
  const ts = parseDate(value ?? null);
  if (!ts) {
    return "--";
  }

  return new Date(ts).toLocaleString("pt-BR");
}

export default function ClientesAdminClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(() => searchParams.get("q") ?? "");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchText = useDeferredValue(searchText);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "lootCoins">("newest");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    const nextSearch = searchParams.get("q") ?? "";
    if (nextSearch !== searchText) {
      setSearchText(nextSearch);
    }
  }, [searchParams, searchText]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = deferredSearchText.trim();
    if (normalized) {
      params.set("q", normalized);
    } else {
      params.delete("q");
    }

    const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [deferredSearchText, pathname, router, searchParams]);

  useEffect(() => {
    if (!auth) {
      return () => undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const currentUser = auth?.currentUser ?? null;
      if (!currentUser) {
        if (!cancelled) {
          setRows([]);
          setNextCursor(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setErrorMessage(null);
      }

      try {
        const page = await fetchClientsPage({ user: currentUser, search: deferredSearchText });
        if (!cancelled) {
          setRows(page.items);
          setNextCursor(page.nextCursor);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load clients.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [deferredSearchText]);

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
          const currentUser = auth?.currentUser ?? null;
          if (!currentUser) {
            return;
          }

          setLoadingMore(true);
          try {
            const page = await fetchClientsPage({ user: currentUser, cursor: nextCursor, search: deferredSearchText });
            setRows((current) => {
              const merged = [...current, ...page.items];
              return Array.from(new Map(merged.map((item) => [item.uid, item])).values());
            });
            setNextCursor(page.nextCursor);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more clients.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [deferredSearchText, loading, loadingMore, nextCursor]);

  const agents = useMemo(() => rows.filter((row) => row.isAgent), [rows]);

  const filteredRows = useMemo(() => {
    return [...rows]
      .filter((row) => statusFilter === "all" || getClientStatus(row).label.toLowerCase() === statusFilter)
      .filter((row) => agentFilter === "all" || (agentFilter === "none" ? !row.assignedAgentId : row.assignedAgentId === agentFilter))
      .sort((left, right) => {
        const leftTime = parseDate(left.createdAt) ?? 0;
        const rightTime = parseDate(right.createdAt) ?? 0;
        if (sortOrder === "lootCoins") {
          return right.lootCoins - left.lootCoins;
        }

        return sortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
      });
  }, [agentFilter, rows, sortOrder, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const visibleRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const stats = useMemo(() => {
    const active = rows.filter((row) => getClientStatus(row).label === "Ativo").length;
    const now = new Date();
    const recent = rows.filter((row) => {
      const createdAt = parseDate(row.createdAt);
      if (!createdAt) return false;
      const created = new Date(createdAt);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    }).length;
    const withoutAgent = rows.filter((row) => !row.assignedAgentId).length;
    return { active, recent, withoutAgent };
  }, [rows]);
  const statCards: Array<{ icon: LucideIcon; label: string; value: number; caption: string; tone: string }> = [
    { icon: Users, label: "Total de clientes", value: rows.length, caption: "Registros carregados", tone: "text-[#e6c46a]" },
    { icon: UserCheck, label: "Ativos", value: stats.active, caption: `${rows.length ? ((stats.active / rows.length) * 100).toFixed(1) : "0.0"}% do total`, tone: "text-[#45c982]" },
    { icon: UserRound, label: "Novos este mês", value: stats.recent, caption: "Dentro da janela de novos", tone: "text-[#72c8ff]" },
    { icon: CircleHelp, label: "Sem partner", value: stats.withoutAgent, caption: `${rows.length ? ((stats.withoutAgent / rows.length) * 100).toFixed(1) : "0.0"}% do total`, tone: "text-[#f2b35f]" },
  ];

  useEffect(() => {
    setPage(1);
  }, [agentFilter, rowsPerPage, sortOrder, statusFilter]);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      window.setTimeout(() => setCopiedEmail((current) => (current === email ? null : current)), 1800);
    } catch {
      setErrorMessage("Could not copy email.");
    }
  };

  const authorizedRequest = async (url: string, payload: Record<string, unknown>) => {
    if (!auth?.currentUser) {
      throw new Error("Sign in with an admin account first.");
    }

    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Request failed.");
    }
  };

  const assignAgent = async (clientUid: string, agentUid: string) => {
    if (!agentUid) {
      return;
    }

    const key = `assign:${clientUid}`;
    setLoadingKey(key);
    setErrorMessage(null);

    try {
      await authorizedRequest("/api/admin/clients/assign-agent", { clientUid, agentUid });
      setRows((current) => current.map((row) => (row.uid === clientUid ? { ...row, assignedAgentId: agentUid } : row)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not assign agent.");
    } finally {
      setLoadingKey(null);
    }
  };

  const unassignAgent = async (clientUid: string) => {
    const key = `unassign:${clientUid}`;
    setLoadingKey(key);
    setErrorMessage(null);

    try {
      await authorizedRequest("/api/admin/clients/unassign-agent", { clientUid });
      setRows((current) => current.map((row) => (row.uid === clientUid ? { ...row, assignedAgentId: null } : row)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not unassign agent.");
    } finally {
      setLoadingKey(null);
    }
  };

  const promoteToAgent = async (clientUid: string) => {
    const key = `promote:${clientUid}`;
    setLoadingKey(key);
    setErrorMessage(null);

    try {
      await authorizedRequest("/api/admin/clients/promote-agent", { clientUid });
      setRows((current) => current.map((row) => (row.uid === clientUid ? { ...row, isAgent: true } : row)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not promote client to agent.");
    } finally {
      setLoadingKey(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <p className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
        Sign in with an admin account to manage clients and partners.
      </p>
    );
  }

  return (
    <section className="mt-5 space-y-4">
      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ icon: Icon, label, value, caption, tone }) => <article key={label} className="rounded-xl border border-white/8 bg-[#101722] p-4"><div className="flex items-start justify-between"><p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#8e98a3]">{label}</p><Icon className={`size-4 ${tone}`} /></div><p className="mt-2 text-2xl font-black text-[#f0ede4]">{value}</p><p className="mt-1 text-[0.62rem] text-[#748092]">{caption}</p></article>)}
      </section>

      <div className="grid gap-3 rounded-xl border border-white/8 bg-[#101722] p-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]">
        <label className="relative block text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8e98a3]" htmlFor="clients-search">
          Busca
          <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-[#748092]" />
          <input id="clients-search" type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar por usuário, email ou UID..." className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c121b] py-2.5 pl-9 pr-3 text-sm text-[#e2e6ea] outline-none transition focus:border-[#d4af5a]/70" />
        </label>
        <label className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8e98a3]">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c121b] px-3 py-2.5 text-sm text-[#e2e6ea]"><option value="all">Todos</option><option value="novo">Novos</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select></label>
        <label className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8e98a3]">Partner<select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c121b] px-3 py-2.5 text-sm text-[#e2e6ea]"><option value="all">Todos os partners</option><option value="none">Sem partner</option>{agents.map((agent) => <option key={agent.uid} value={agent.uid}>{agent.username}</option>)}</select></label>
        <label className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#8e98a3]">Ordenar por<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest" | "lootCoins")} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c121b] px-3 py-2.5 text-sm text-[#e2e6ea]"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="lootCoins">Mais Loot Coins</option></select></label>
        <button type="button" onClick={() => { setSearchText(""); setStatusFilter("all"); setAgentFilter("all"); setSortOrder("newest"); }} className="self-end rounded-lg border border-[#d4af5a]/35 px-3 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#e6c46a] hover:bg-[#2a2110]">Limpar filtros</button>
      </div>

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {loading ? (
          <p className="px-5 py-4 text-sm text-green-600">Carregando clientes...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">No clients found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ultimo acesso</th>
                <th className="px-4 py-3">Partner atual</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const assignKey = `assign:${row.uid}`;
                const unassignKey = `unassign:${row.uid}`;
                const promoteKey = `promote:${row.uid}`;
                const status = getClientStatus(row);

                return (
                  <tr key={row.uid} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#172538] text-sm font-black text-[#e6c46a]">{row.username.charAt(0).toUpperCase()}</span><div><p className="font-semibold text-[#f0ede4]">{row.username}</p><p className="mt-1 text-xs text-[#748092]">{row.uid}</p><p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#d4af5a]">{row.lootCoins.toFixed(2)} Loot Coins</p></div></div>
                      {row.isAgent ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-400">
                          Partner ({row.agentFeeSharePercent.toFixed(2)}% da taxa da plataforma)
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#a8b3c1]"><div className="flex items-center gap-2">{row.email}<button type="button" onClick={() => void copyEmail(row.email)} className="text-[#748092] hover:text-[#e6c46a]" title="Copiar email">{copiedEmail === row.email ? <Check className="size-3.5 text-[#45c982]" /> : <Copy className="size-3.5" />}</button></div></td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 font-semibold uppercase tracking-[0.14em] ${status.tone}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#a8b3c1]">{formatLastAccess(row.lastActivityAt)}</td>
                    <td className="px-4 py-3 text-xs text-[#e6c46a]">{row.assignedAgentId ?? "Sem partner"}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[420px] flex-wrap items-center gap-2">
                        <select
                          defaultValue={row.assignedAgentId ?? ""}
                          onChange={(event) => {
                            const nextAgentUid = event.target.value;
                            if (nextAgentUid) {
                              void assignAgent(row.uid, nextAgentUid);
                            }
                          }}
                          disabled={loadingKey === assignKey}
                          className="rounded-md border border-green-800 bg-black px-3 py-2 text-xs text-green-300"
                        >
                          <option value="">Vincular partner...</option>
                          {agents.map((agent) => (
                            <option key={agent.uid} value={agent.uid} disabled={agent.uid === row.uid}>
                              {agent.username} ({agent.uid})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void promoteToAgent(row.uid)}
                          disabled={loadingKey === promoteKey || row.isAgent}
                          className="inline-flex rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {loadingKey === promoteKey ? "Promovendo..." : row.isAgent ? "Já é partner" : "Tornar partner"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void unassignAgent(row.uid)}
                          disabled={loadingKey === unassignKey || !row.assignedAgentId}
                          className="inline-flex rounded-md border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {loadingKey === unassignKey ? "Desvinculando..." : "Desvincular partner"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#101722] px-4 py-3 text-xs text-[#8e98a3]">
        <span>Mostrando {filteredRows.length ? (page - 1) * rowsPerPage + 1 : 0}–{Math.min(page * rowsPerPage, filteredRows.length)} de {filteredRows.length} clientes</span>
        <div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-white/10 px-2 py-1 disabled:opacity-30">‹</button><span className="rounded-md bg-[#d4af5a] px-2.5 py-1 font-bold text-[#17120a]">{page}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-md border border-white/10 px-2 py-1 disabled:opacity-30">›</button><label className="ml-2">Itens por página <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))} className="ml-1 rounded-md border border-white/10 bg-[#0c121b] px-2 py-1 text-[#e2e6ea]"><option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label></div>
      </div>


      <div ref={loadMoreRef} className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
          {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais clientes"}
        </span>
      </div>
    </section>
  );
}
