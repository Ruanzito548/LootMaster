"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type AgentRow = {
  uid: string;
  username: string;
  email: string;
  agentFeeSharePercent: number;
  agentReferralCode: string;
};

type Props = {
  rows: AgentRow[];
};

export default function AgentesAdminClient({ rows }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth?.currentUser));
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.uid, row.agentFeeSharePercent.toString()])),
  );

  useEffect(() => {
    if (!auth) {
      return () => undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

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

      router.refresh();
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
        {rows.length === 0 ? (
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
    </section>
  );
}
