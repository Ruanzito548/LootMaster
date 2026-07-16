"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

import type { GiftcardClaimRow } from "./giftcard-claims-data";

type Props = {
  rows: GiftcardClaimRow[];
  mode: "open" | "completed";
};

export default function GiftcardClaimsClient({ rows, mode }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

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

      router.refresh();
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

      <article className="overflow-x-auto rounded-xl border border-green-900 bg-black">
        {rows.length === 0 ? (
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
    </section>
  );
}
