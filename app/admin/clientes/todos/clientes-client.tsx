"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import type { ClientRow } from "../clientes-types";

const PAGE_SIZE = 50;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchClientsPage(input: { user: User | null; cursor?: string | null }) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/clients", window.location.origin);
  url.searchParams.set("mode", "all");
  url.searchParams.set("limit", String(PAGE_SIZE));
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

export default function ClientesAdminClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
        const page = await fetchClientsPage({ user: currentUser });
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
  }, []);

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
            const page = await fetchClientsPage({ user: currentUser, cursor: nextCursor });
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
  }, [loading, loadingMore, nextCursor]);

  const agents = useMemo(() => rows.filter((row) => row.isAgent), [rows]);

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
        Sign in with an admin account to manage clients and agents.
      </p>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
          {errorMessage}
        </p>
      ) : null}

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
                <th className="px-4 py-3">Agente atual</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const assignKey = `assign:${row.uid}`;
                const unassignKey = `unassign:${row.uid}`;
                const promoteKey = `promote:${row.uid}`;

                return (
                  <tr key={row.uid} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-green-300">{row.username}</p>
                      <p className="mt-1 text-xs text-green-600">{row.uid}</p>
                      {row.isAgent ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-400">
                          Agente ({row.agentFeeSharePercent.toFixed(2)}% da taxa da plataforma)
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-green-500">{row.email}</td>
                    <td className="px-4 py-3 text-xs text-green-500">{row.assignedAgentId ?? "Sem agente"}</td>
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
                          <option value="">Vincular agente...</option>
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
                          {loadingKey === promoteKey ? "Promovendo..." : row.isAgent ? "Ja e agente" : "Tornar agente"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void unassignAgent(row.uid)}
                          disabled={loadingKey === unassignKey || !row.assignedAgentId}
                          className="inline-flex rounded-md border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {loadingKey === unassignKey ? "Desvinculando..." : "Desvincular agente"}
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

      <div ref={loadMoreRef} className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
          {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais clientes"}
        </span>
      </div>
    </section>
  );
}
