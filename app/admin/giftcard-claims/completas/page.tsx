import Link from "next/link";

import GiftcardClaimsClient from "../giftcard-claims-client";
import { loadGiftcardClaimRows, type GiftcardClaimRow } from "../giftcard-claims-data";

export const dynamic = "force-dynamic";

export default async function AdminGiftcardClaimsCompletedPage() {
  let loadError: string | null = null;
  let rows: GiftcardClaimRow[] = [];

  try {
    const allRows = await loadGiftcardClaimRows();
    rows = allRows.filter((row) => row.status === "completed");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load gift card claims.";
  }

  return (
    <div className="text-green-300">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Reivindicacoes</p>
          <h1 className="mt-1 text-3xl font-semibold text-green-200 sm:text-4xl">Reivindicacoes de Gifcards Completas</h1>
          <p className="mt-2 text-sm text-green-500">Historico de giftcards ja enviados.</p>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm font-medium text-red-400">{loadError}</p>
      ) : (
        <div className="mt-6">
          <GiftcardClaimsClient rows={rows} mode="completed" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
        >
          Voltar ao admin
        </Link>
      </div>
    </div>
  );
}
