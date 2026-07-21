"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import type { AgentRow } from "../clientes-types";

const PAGE_SIZE = 50;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchAgentsPage(input: { user: User | null; cursor?: string | null }) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/clients", window.location.origin);
  url.searchParams.set("mode", "agents");
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
    items?: AgentRow[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load agents.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

export default function AgentesAdminClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
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
          setDraftValues({});
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
        const page = await fetchAgentsPage({ user: currentUser });
        if (!cancelled) {
          setRows(page.items);
          setDraftValues(Object.fromEntries(page.items.map((row) => [row.uid, row.agentFeeSharePercent.toString()])));
          setNextCursor(page.nextCursor);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load agents.");
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
            const page = await fetchAgentsPage({ user: currentUser, cursor: nextCursor });
            setRows((current) => {
              const merged = [...current, ...page.items];
              return Array.from(new Map(merged.map((item) => [item.uid, item])).values());
            });
            setDraftValues((current) => ({
              ...current,
              ...Object.fromEntries(page.items.map((row) => [row.uid, row.agentFeeSharePercent.toString()])),
            }));
            setNextCursor(page.nextCursor);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more agents.");
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

  const saveFeeShare = async (agentUid: string) => {
    if (!auth?.currentUser) {
      setErrorMessage("Sign in with an admin account first.");
      return;
    }

    const nextValue = Number(draftValues[agentUid]);
    if (!Number.isFinite(nextValue)) {
      setErrorMessage("Percentual invalido.");
      return;
    }

    setLoadingUid(agentUid);
    setErrorMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/clients/update-agent-fee-share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          agentUid,
          feeSharePercent: nextValue,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update agent percentage.");
      }

      setRows((current) =>
        current.map((row) =>
          row.uid === agentUid
            ? {
                ...row,
                agentFeeSharePercent: nextValue,
              }
            : row,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update agent percentage.");
    } finally {
      setLoadingUid(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <p className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
        Sign in with an admin account to manage agents.
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
          <p className="px-5 py-4 text-sm text-green-600">Carregando agentes...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">No agents found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">% da taxa</th>
                <th className="px-4 py-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.uid} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-green-300">{row.username}</p>
                    <p className="mt-1 text-xs text-green-600">{row.uid}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-green-500">{row.email}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-300">{row.agentReferralCode || "--"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={draftValues[row.uid] ?? "0"}
                      onChange={(event) =>
                        setDraftValues((current) => ({
                          ...current,
                          [row.uid]: event.target.value,
                        }))
                      }
                      className="w-28 rounded-md border border-green-800 bg-black px-3 py-2 text-xs text-green-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void saveFeeShare(row.uid)}
                      disabled={loadingUid === row.uid}
                      className="inline-flex rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loadingUid === row.uid ? "Salvando..." : "Salvar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <div ref={loadMoreRef} className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
          {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais agentes"}
        </span>
      </div>
    </section>
  );
}
