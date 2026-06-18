"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useProfileSession } from "@/app/profile/use-profile-session";
import { CHEST_IDS, type ChestId } from "@/lib/chests";

type RewardOdd = {
  type: string;
  weight: number;
};

type ChestProfileConfig = {
  rewardOdds: RewardOdd[];
  coinRange: { min: number; max: number };
  itemRarityWeights: Array<{ rarity: string; weight: number }>;
  xpGain: number;
  giftCardFragment: { chancePercent: number; min: number; max: number };
  accountDrop: { enabled: boolean; chancePercent: number };
};

type ChestConfigPayload = {
  schemaVersion: number;
  updatedAtMs: number;
  byChest: Record<ChestId, ChestProfileConfig>;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function AdminChestConfigPage() {
  const { user, status } = useProfileSession();

  const [rawJson, setRawJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedSummary = useMemo(() => {
    if (!rawJson.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawJson) as ChestConfigPayload;
      return parsed;
    } catch {
      return null;
    }
  }, [rawJson]);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/rewards/chests-config", {
          headers: {
            authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json()) as { config?: ChestConfigPayload; error?: string };

        if (!response.ok || !payload.config) {
          throw new Error(payload.error ?? "Could not load chest config.");
        }

        if (!cancelled) {
          setRawJson(formatJson(payload.config));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load chest config.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveConfig = async () => {
    if (!user || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = JSON.parse(rawJson);
      const token = await user.getIdToken();

      const response = await fetch("/api/admin/rewards/chests-config", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config: parsed }),
      });

      const payload = (await response.json()) as { config?: ChestConfigPayload; error?: string };
      if (!response.ok || !payload.config) {
        throw new Error(payload.error ?? "Could not save chest config.");
      }

      setRawJson(formatJson(payload.config));
      setSuccessMessage("Chest configuration updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid JSON or save failure.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black text-green-300">
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-green-900/30" />
          <div className="mt-4 h-96 w-full animate-pulse rounded-2xl bg-green-900/20" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-300">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-12 lg:px-8">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-green-600">Admin / Rewards</p>
          <h1 className="text-4xl font-black leading-tight text-green-200 sm:text-5xl">Chest Reward Config</h1>
          <p className="max-w-3xl text-sm leading-7 text-green-600">
            Edit reward balancing, Gift Card Fragment rates, and legendary account drops in one JSON configuration.
          </p>
        </div>

        <section className="mt-6 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {CHEST_IDS.map((chestId) => {
              const profile = parsedSummary?.byChest?.[chestId];
              const totalWeight = profile ? profile.rewardOdds.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0) : 0;

              return (
                <article key={chestId} className="rounded-2xl border border-green-900 bg-black/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-500">{chestId}</p>
                  <p className="mt-1 text-xl font-black text-green-200">{profile?.xpGain ?? 0} XP</p>
                  <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-green-600">Weight total: {totalWeight}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-green-900 bg-green-950/20 p-5">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.15em] text-green-600">
            Chest Config JSON
            <textarea
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              className="min-h-[480px] w-full rounded-2xl border border-green-900 bg-black/70 p-4 font-mono text-xs text-green-200 outline-none focus:border-green-600"
              spellCheck={false}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={!user || saving}
              className="rounded-md border border-green-600 bg-green-950 px-5 py-3 text-sm font-semibold text-green-200 transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save config"}
            </button>

            <button
              type="button"
              onClick={() => setRawJson(formatJson(parsedSummary))}
              disabled={!parsedSummary}
              className="rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Format JSON
            </button>

            <Link
              href="/admin"
              className="inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
            >
              Back to admin
            </Link>
          </div>

          {successMessage ? <p className="mt-3 text-sm font-semibold text-emerald-400">{successMessage}</p> : null}
          {errorMessage ? <p className="mt-3 text-sm font-semibold text-rose-400">{errorMessage}</p> : null}
        </section>
      </main>
    </div>
  );
}
