export const WALLET_LABELS: Record<string, string> = {
  normal: "Carteira Normal",
  jackpotCommon: "Jackpot",
  jackpotRare: "Jackpot Lendário",
};

export type ChestWalletPayoutLogItem = {
  type: string;
  title: string;
  quantity: number;
  valueUsd: number;
};

export type ChestWalletPayoutLedgerEntry = {
  id: string;
  walletId: string;
  amountUsd: number;
  userId?: string;
  createdAt: string;
  createdAtMs?: number;
  metadata?: {
    userEmail?: string;
    chestId?: string;
    items?: ChestWalletPayoutLogItem[];
  };
};

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateTime(value?: string, valueMs?: number): string {
  const date = valueMs ? new Date(valueMs) : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("pt-BR");
}

// Only ledger entries that actually shipped coins/items to a customer count as a payout log row.
export function extractPayoutLogEntries(ledger: Array<Record<string, unknown>> | undefined, limit?: number): ChestWalletPayoutLedgerEntry[] {
  const entries = ledger ?? [];

  const filtered = entries
    .filter((entry) => Array.isArray((entry as { metadata?: { items?: unknown[] } }).metadata?.items) && ((entry as { metadata?: { items?: unknown[] } }).metadata?.items?.length ?? 0) > 0)
    .map((entry) => entry as ChestWalletPayoutLedgerEntry)
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}
