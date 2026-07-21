"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { auth } from "@/lib/firebase";

import type { GiftcardClaimRow } from "./giftcard-claims-types";

type Props = {
  mode: "open" | "completed";
};

const PAGE_SIZE = 50;

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchClaimsPage(input: {
  user: User | null;
  mode: Props["mode"];
  cursor?: string | null;
  search?: string;
}) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Your session is not ready. Please wait a few seconds and try again.");
  }

  const url = new URL("/api/admin/giftcard-claims", window.location.origin);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("mode", input.mode);
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
    items?: GiftcardClaimRow[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load gift card claims.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

export default function GiftcardClaimsClient({ mode }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<GiftcardClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(() => searchParams.get("q") ?? "");
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
      return;
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
        const page = await fetchClaimsPage({ user: currentUser, mode, search: deferredSearchText });
        if (!cancelled) {
          setRows(page.items);
          setNextCursor(page.nextCursor);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load gift card claims.");
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
  }, [deferredSearchText, mode]);

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
            const page = await fetchClaimsPage({ user: currentUser, mode, cursor: nextCursor, search: deferredSearchText });
            setRows((current) => {
              const merged = [...current, ...page.items];
              return Array.from(new Map(merged.map((item) => [item.claimId, item])).values());
            });
            setNextCursor(page.nextCursor);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more gift card claims.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "220px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [deferredSearchText, loading, loadingMore, mode, nextCursor]);

  const markSent = async (claimId: string) => {
    if (!auth?.currentUser || busyId) {
      return;
    }

    setBusyId(claimId);
    setErrorMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/giftcard-claims/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ claimId }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Could not complete gift card claim.");
        return;
      }

      setRows((current) => current.filter((row) => row.claimId !== claimId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not complete gift card claim.");
    } finally {
      setBusyId(null);
    }
  };

  const emptyText = mode === "open" ? "Nenhuma reivindicacao de giftcard aberta." : "Nenhuma reivindicacao de giftcard completa.";

  return (
    <section className="space-y-5">
      {!isAuthenticated ? (
        <p className="rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
          Sign in with an admin account to manage gift card claims.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-xl border border-green-900 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600" htmlFor="giftcard-claims-search">
          Buscar por usuario, email ou giftcard
        </label>
        <div className="flex w-full items-center gap-3 sm:max-w-md">
          <input
            id="giftcard-claims-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Digite claim, usuario, email ou titulo"
            className="w-full rounded-md border border-green-800 bg-black px-3 py-2 text-sm text-green-200 outline-none transition placeholder:text-green-800 focus:border-emerald-500"
          />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-green-700">{rows.length} carregados</span>
        </div>
      </div>

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {loading ? (
          <p className="px-5 py-4 text-sm text-green-600">Carregando reivindicacoes...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">{emptyText}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Claim</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Giftcard</th>
                <th className="px-4 py-3">Email Resgate</th>
                <th className="px-4 py-3">Pais</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const busy = busyId === row.claimId;
                const isOpen = row.status === "open";

                return (
                  <tr key={row.claimId} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                    <td className="px-4 py-3 text-xs text-green-500">{row.claimId}</td>
                    <td className="px-4 py-3 text-xs text-green-400">
                      <p>{row.username || "Sem nome"}</p>
                      <p className="text-green-700">{row.accountEmail || row.uid}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-green-300">
                      <p className="font-semibold">{row.giftCardTitle}</p>
                      <p className="text-green-600">{row.giftCardItemId}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-green-400">{row.redeemEmail || "--"}</td>
                    <td className="px-4 py-3 text-xs uppercase text-green-500">{row.country || "--"}</td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-green-400">{row.status}</td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      <p>{row.createdAtLabel}</p>
                      {row.completedAtLabel !== "--" ? <p className="text-green-700">Enviado: {row.completedAtLabel}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      {mode === "open" ? (
                        <button
                          type="button"
                          onClick={() => void markSent(row.claimId)}
                          disabled={!isAuthenticated || !isOpen || busy}
                          className="inline-flex rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy ? "Enviando..." : "Marcar como enviado"}
                        </button>
                      ) : (
                        <span className="text-xs text-green-700">Concluido</span>
                      )}
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
          {loadingMore ? "Carregando mais..." : nextCursor ? "Role para carregar mais" : "Sem mais reivindicacoes"}
        </span>
      </div>
    </section>
  );
}
