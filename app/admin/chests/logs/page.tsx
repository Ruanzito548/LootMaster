"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CHEST_IDS, type ChestId } from "@/lib/chests";
import {
  WALLET_LABELS,
  extractPayoutLogEntries,
  formatDateTime,
  formatUsd,
  type ChestWalletPayoutLedgerEntry,
} from "@/lib/chest-wallet-log-format";

type ChestConfigPayload = {
  walletEconomyState?: {
    ledger: Array<Record<string, unknown>>;
  };
};

const CHEST_LABELS: Record<ChestId, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

const WALLET_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todas as carteiras" },
  { value: "normal", label: WALLET_LABELS.normal },
  { value: "jackpotCommon", label: WALLET_LABELS.jackpotCommon },
  { value: "jackpotRare", label: WALLET_LABELS.jackpotRare },
];

const PAGE_SIZE = 25;

export default function AdminChestPayoutLogsPage() {
  const { user, status } = useProfileSession();

  const [entries, setEntries] = useState<ChestWalletPayoutLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [walletFilter, setWalletFilter] = useState("all");
  const [chestFilter, setChestFilter] = useState<"all" | ChestId>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/rewards/chests-config", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await response.json()) as { config?: ChestConfigPayload; error?: string };

        if (!response.ok || !payload.config) {
          throw new Error(payload.error ?? "Could not load chest payout logs.");
        }

        if (!cancelled) {
          setEntries(extractPayoutLogEntries(payload.config.walletEconomyState?.ledger));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load chest payout logs.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return entries.filter((entry) => {
      if (walletFilter !== "all" && entry.walletId !== walletFilter) {
        return false;
      }

      if (chestFilter !== "all" && entry.metadata?.chestId !== chestFilter) {
        return false;
      }

      if (term) {
        const haystack = `${entry.metadata?.userEmail ?? ""} ${entry.userId ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [entries, walletFilter, chestFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalPaidUsd = useMemo(() => filteredEntries.reduce((sum, entry) => sum + entry.amountUsd, 0), [filteredEntries]);

  if (status === "loading") {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-green-300">Carregando sessão...</div>;
  }

  if (status !== "authenticated") {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-green-300">Faça login como administrador para ver os logs.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/chests" className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500 hover:text-green-300">
            ← Voltar para Rewards e Baús
          </Link>
          <h1 className="mt-2 text-2xl font-black text-green-100">Log completo de pagamentos dos baús</h1>
          <p className="mt-1 text-sm text-green-700">Cada linha é um envio real de moedas/itens de uma carteira para um cliente.</p>
        </div>
        <div className="rounded-full border border-green-800/70 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
          {filteredEntries.length} registros • {formatUsd(totalPaidUsd)} USD
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-800/70 bg-rose-950/40 p-3 text-sm text-rose-300">{errorMessage}</div>
      ) : null}

      <div className="mt-5 grid gap-3 rounded-3xl border border-green-900/70 bg-green-950/20 p-4 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
          Carteira
          <select
            value={walletFilter}
            onChange={(event) => {
              setWalletFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100"
          >
            {WALLET_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
          Baú
          <select
            value={chestFilter}
            onChange={(event) => {
              setChestFilter(event.target.value as "all" | ChestId);
              setPage(1);
            }}
            className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100"
          >
            <option value="all">Todos os baús</option>
            {CHEST_IDS.map((chestId) => (
              <option key={chestId} value={chestId}>{CHEST_LABELS[chestId]}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
          Cliente (email ou UID)
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="buscar cliente..."
            className="rounded-2xl border border-green-900 bg-black/70 px-3 py-2 text-sm font-medium text-green-100"
          />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-green-900/70">
        <table className="w-full min-w-[860px] text-left text-sm text-green-700">
          <thead className="bg-black/40 text-[11px] font-bold uppercase tracking-[0.16em] text-green-600">
            <tr>
              <th className="px-3 py-2">Data/Hora</th>
              <th className="px-3 py-2">Carteira</th>
              <th className="px-3 py-2">Baú</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Itens</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-green-700">Carregando registros...</td>
              </tr>
            ) : pagedEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-green-700">Nenhum pagamento encontrado com esses filtros.</td>
              </tr>
            ) : (
              pagedEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-green-900/50">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(entry.createdAt, entry.createdAtMs)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{WALLET_LABELS[entry.walletId] ?? entry.walletId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{entry.metadata?.chestId ? (CHEST_LABELS[entry.metadata.chestId as ChestId] ?? entry.metadata.chestId) : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{entry.metadata?.userEmail ?? entry.userId ?? "—"}</td>
                  <td className="px-3 py-2">
                    {(entry.metadata?.items ?? []).map((item, index) => (
                      <span key={`${entry.id}-${index}`} className="mr-2 inline-block">
                        {item.quantity}x {item.title} ({formatUsd(item.valueUsd)} USD)
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-100 whitespace-nowrap">{formatUsd(entry.amountUsd)} USD</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-green-700">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 font-semibold uppercase tracking-[0.14em] text-green-400 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-full border border-green-800/70 bg-black/40 px-3 py-1 font-semibold uppercase tracking-[0.14em] text-green-400 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
