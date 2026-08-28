"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import type { WithdrawalRow } from "./withdrawals-types";

type Props = {
  mode: "pending" | "approved" | "rejected";
};

const PAGE_SIZE = 50;

function toStatusFilter(mode: Props["mode"]): "pending_review" | "approved" | "rejected" {
  if (mode === "approved") {
    return "approved";
  }

  if (mode === "rejected") {
    return "rejected";
  }

  return "pending_review";
}

async function getAuthorizationHeader(user: User | null) {
  const token = await user?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function fetchWithdrawalsPage(input: {
  user: User | null;
  mode: Props["mode"];
  cursor?: string | null;
}) {
  const headers = await getAuthorizationHeader(input.user);
  if (!headers) {
    throw new Error("Sua sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.");
  }

  const url = new URL("/api/admin/withdrawals", window.location.origin);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("status", toStatusFilter(input.mode));
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
    items?: WithdrawalRow[];
    nextCursor?: string | null;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível carregar as solicitações de saque.");
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

export default function WithdrawalsClient({ mode }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  const reload = useCallback(async () => {
    const currentUser = auth?.currentUser ?? null;
    if (!currentUser) {
      setRows([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const page = await fetchWithdrawalsPage({ user: currentUser, mode });
      setRows(page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load withdrawal requests.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

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
          const currentUser = auth?.currentUser ?? null;
          if (!currentUser) {
            return;
          }

          setLoadingMore(true);
          try {
            const page = await fetchWithdrawalsPage({ user: currentUser, mode, cursor: nextCursor });
            setRows((current) => {
              const merged = [...current, ...page.items];
              return Array.from(new Map(merged.map((item) => [item.requestId, item])).values());
            });
            setNextCursor(page.nextCursor);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load more withdrawals.");
          } finally {
            setLoadingMore(false);
          }
        })();
      },
      { rootMargin: "220px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, mode, nextCursor]);

  const review = async (requestId: string, action: "approve" | "reject") => {
    if (!auth?.currentUser || busyId) {
      return;
    }

    setBusyId(requestId);
    setErrorMessage(null);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/withdrawals/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          requestId,
          action,
        }),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.error ?? "Could not review withdrawal request.");
        return;
      }

      setRows((current) => current.filter((row) => row.requestId !== requestId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not review withdrawal request.");
    } finally {
      setBusyId(null);
    }
  };

  const sectionEmptyText =
    mode === "pending"
      ? "Nenhuma solicitação de saque pendente."
      : mode === "approved"
        ? "Nenhum saque aprovado ainda."
        : "Nenhum saque rejeitado.";

  const canDownloadSpreadsheet = mode === "approved" || mode === "rejected";

  const downloadSpreadsheet = () => {
    if (!canDownloadSpreadsheet || rows.length === 0) {
      return;
    }

    const escapeCell = (value: string | number) => {
      const text = String(value);
      if (/[",\n;]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = [
      "Request",
      "UID",
      "Email",
      "Amount Loot",
      "Method",
      "Destination",
      "Status",
      "Created At",
      "Reviewed At",
    ];

    const body = rows.map((row) => [
      row.requestId,
      row.uid,
      row.email,
      row.amount.toFixed(2),
      row.payoutMethod,
      row.payoutReference,
      row.status,
      row.createdAtLabel,
      row.reviewedAtLabel,
    ]);

    const csv = [header, ...body].map((line) => line.map(escapeCell).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const dateTag = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `saques-${mode}-${dateTag}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      {!isAuthenticated ? (
        <p className="rounded-xl border border-amber-900 bg-amber-950/20 px-5 py-4 text-sm font-medium text-amber-300">
          Entre com uma conta de administrador para revisar as solicitações de saque.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{errorMessage}</p>
      ) : null}

      {canDownloadSpreadsheet ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={downloadSpreadsheet}
            disabled={rows.length === 0}
            className="inline-flex rounded-md border border-green-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-green-200 transition hover:bg-green-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Baixar planilha (CSV)
          </button>
        </div>
      ) : null}

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {loading ? (
          <p className="px-5 py-4 text-sm text-green-600">Carregando solicitações de saque...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-green-600">{sectionEmptyText}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-green-900 text-xs font-semibold uppercase tracking-wide text-green-600">
                <th className="px-4 py-3">Solicitação</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isPending = row.status === "pending_review";
                const busy = busyId === row.requestId;

                return (
                  <tr key={row.requestId} className={`border-b border-green-950 ${index % 2 === 0 ? "" : "bg-green-950/20"}`}>
                    <td className="px-4 py-3 text-xs text-green-500">{row.requestId}</td>
                    <td className="px-4 py-3 text-xs text-green-400">
                      <p>{row.email || "Sem e-mail"}</p>
                      <p className="text-green-700">{row.uid}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-300">{row.amount.toFixed(2)} Loot</td>
                    <td className="px-4 py-3 uppercase text-green-500">{row.payoutMethod}</td>
                    <td className="px-4 py-3 text-xs text-green-500">{row.payoutReference}</td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-green-400">{row.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-xs text-green-500">
                      <p>{row.createdAtLabel}</p>
                      {row.reviewedAtLabel !== "--" ? <p className="text-green-700">Revisado: {row.reviewedAtLabel}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void review(row.requestId, "approve")}
                          disabled={!isAuthenticated || !isPending || busy}
                          className="inline-flex rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy ? "Processando..." : "Marcar como pago"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void review(row.requestId, "reject")}
                          disabled={!isAuthenticated || !isPending || busy}
                          className="inline-flex rounded-md border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy ? "Processando..." : "Rejeitar"}
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
          {loadingMore ? "Loading more..." : nextCursor ? "Scroll to load more" : "No more rows"}
        </span>
      </div>
    </section>
  );
}
