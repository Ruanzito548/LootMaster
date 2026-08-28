"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { auth } from "@/lib/firebase";
import type { AgentRow, ClientRow } from "../clientes-types";

const PAGE_SIZE = 50;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchAgentsPage(input: { user: User | null; cursor?: string | null; search?: string }) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/clients", window.location.origin);
  url.searchParams.set("mode", "agents");
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(() => searchParams.get("q") ?? "");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null);
  const [linkedClients, setLinkedClients] = useState<ClientRow[]>([]);
  const [linkedClientsLoading, setLinkedClientsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "lootCoins">("newest");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchText = useDeferredValue(searchText);

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
        const page = await fetchAgentsPage({ user: currentUser, search: deferredSearchText });
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
            const page = await fetchAgentsPage({ user: currentUser, cursor: nextCursor, search: deferredSearchText });
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
  }, [deferredSearchText, loading, loadingMore, nextCursor]);

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

  const copyReferralCode = async (agentReferralCode: string) => {
    if (!agentReferralCode.trim()) {
      return;
    }

    await navigator.clipboard.writeText(agentReferralCode.trim());
    setCopiedCode(agentReferralCode.trim());
    window.setTimeout(() => setCopiedCode((current) => (current === agentReferralCode.trim() ? null : current)), 1500);
  };

  const copyReferralLink = async (agentReferralCode: string) => {
    if (!agentReferralCode.trim()) {
      return;
    }

    const referralLink = `${window.location.origin}/?agent=${encodeURIComponent(agentReferralCode.trim())}`;
    await navigator.clipboard.writeText(referralLink);
    setCopiedCode(agentReferralCode.trim());
    window.setTimeout(() => setCopiedCode((current) => (current === agentReferralCode.trim() ? null : current)), 1500);
  };

  const showLinkedClients = async (agent: AgentRow) => {
    if (!auth?.currentUser) return;
    setSelectedAgent(agent);
    setLinkedClientsLoading(true);
    setErrorMessage(null);

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/admin/clients?mode=all&limit=100&assignedAgentId=${encodeURIComponent(agent.uid)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { error?: string; items?: ClientRow[] };
      if (!response.ok) throw new Error(payload.error ?? "Could not load linked clients.");
      setLinkedClients(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load linked clients.");
      setLinkedClients([]);
    } finally {
      setLinkedClientsLoading(false);
    }
  };

  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    if (sortOrder === "lootCoins") return right.lootCoins - left.lootCoins;
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return sortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
  }), [rows, sortOrder]);

  if (!isAuthenticated) {
    return (
      <p className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
        Entre com uma conta de administrador para gerenciar parceiros.
      </p>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-200">
        <p className="font-semibold uppercase tracking-[0.14em] text-emerald-400">Referral code</p>
        <p className="mt-2 leading-6 text-emerald-100">
          Cada parceiro já tem um código. No checkout, o cliente pode usar <span className="font-semibold">?agent=CODIGO</span> para vincular a primeira compra automaticamente.
        </p>
        {copiedCode ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400">Copiado: {copiedCode}</p> : null}
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-xl border border-green-900 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600" htmlFor="agents-search">
          Buscar por parceiro ou e-mail
        </label>
        <div className="flex w-full flex-wrap items-center gap-3 sm:max-w-xl">
          <input
            id="agents-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Digite username, email, UID ou codigo"
            className="w-full rounded-md border border-green-800 bg-black px-3 py-2 text-sm text-green-200 outline-none transition placeholder:text-green-800 focus:border-emerald-500"
          />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-green-700">{rows.length} carregados</span>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest" | "lootCoins")} className="rounded-md border border-green-800 bg-black px-3 py-2 text-xs text-green-300">
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="lootCoins">Mais Loot Coins</option>
          </select>
        </div>
      </div>

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {loading ? (
          <p className="px-5 py-4 text-sm text-green-600">Carregando parceiros...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">Nenhum parceiro encontrado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Parceiro</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">% da taxa</th>
                <th className="px-4 py-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr key={row.uid} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void showLinkedClients(row)} className="text-left font-semibold text-green-300 transition hover:text-[#e6c46a] hover:underline">{row.username}</button>
                    <p className="mt-1 text-xs text-green-600">{row.uid}</p>
                    <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#d4af5a]">{row.lootCoins.toFixed(2)} Loot Coins</p>
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveFeeShare(row.uid)}
                        disabled={loadingUid === row.uid}
                        className="inline-flex rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {loadingUid === row.uid ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyReferralCode(row.agentReferralCode)}
                        disabled={!row.agentReferralCode}
                        className="inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Copiar codigo
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyReferralLink(row.agentReferralCode)}
                        disabled={!row.agentReferralCode}
                        className="inline-flex rounded-md border border-green-800 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Copiar link
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      {selectedAgent ? (
        <section className="rounded-xl border border-[#d4af5a]/30 bg-[#101722] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#d4af5a]">Jogadores vinculados</p>
              <h2 className="mt-1 text-xl font-black text-[#f0ede4]">{selectedAgent.username}</h2>
              <p className="mt-1 text-xs text-[#8e98a3]">Saldo do parceiro: {selectedAgent.lootCoins.toFixed(2)} Loot Coins</p>
            </div>
            <button type="button" onClick={() => setSelectedAgent(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-[#a8b3c1] hover:text-[#e6c46a]">Fechar</button>
          </div>
          {linkedClientsLoading ? <p className="mt-4 text-sm text-[#8e98a3]">Carregando jogadores...</p> : linkedClients.length === 0 ? <p className="mt-4 text-sm text-[#8e98a3]">Nenhum jogador vinculado a este parceiro.</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{linkedClients.map((client) => <div key={client.uid} className="rounded-lg border border-white/8 bg-[#0c121b] p-3"><p className="font-bold text-[#f0ede4]">{client.username}</p><p className="mt-1 text-xs text-[#748092]">{client.email}</p><p className="mt-2 text-xs font-bold text-[#e6c46a]">{client.lootCoins.toFixed(2)} Loot Coins</p></div>)}</div>}
        </section>
      ) : null}

      <div ref={loadMoreRef} className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-900 bg-black/25 px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-green-600">
          {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais parceiros"}
        </span>
      </div>
    </section>
  );
}
