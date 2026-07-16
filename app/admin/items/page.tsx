import Link from "next/link";

import { InventoryItemsAdmin } from "../../components/inventory-items-admin";
import { GrantRandomChestButton } from "../dashboard/grant-random-chest-button";
import { getLiveChestSystemConfig } from "@/lib/chest-config";
import { CHEST_DEFINITIONS, CHEST_IDS } from "@/lib/chests";
import { LEVEL_CAP, XP_PER_USD, buildLevelReward, formatMoneyUsd, getXpThresholdForLevel } from "@/lib/level-rewards";

function formatDropType(type: string): string {
  if (type === "coins") {
    return "Moedas";
  }

  if (type === "item") {
    return "Item";
  }

  if (type === "chest") {
    return "Bau";
  }

  if (type === "cosmetic") {
    return "Cosmetico";
  }

  return type;
}

function formatRewardBundle(level: number): string {
  const reward = buildLevelReward(level, `admin-items-reward-${level}`);
  const parts = Object.entries(reward.chestBundle)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0)
    .map(([chestId, quantity]) => `${quantity}x ${chestId}`);

  if (parts.length === 0) {
    return "Sem bundle";
  }

  return parts.join(" + ");
}

export const dynamic = "force-dynamic";

export default async function AdminItemsPage() {
  const chestConfig = await getLiveChestSystemConfig();

  return (
    <>
      <InventoryItemsAdmin />
      <div className="mx-auto w-full max-w-5xl px-6 pb-12 lg:px-8">
        <GrantRandomChestButton />

        <section className="mt-6 rounded-[1.2rem] border border-green-900 bg-black/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Loot Table</p>
              <h2 className="mt-1 text-lg font-black text-green-200">Tabela atual de drops dos baus</h2>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700">
              Atualizada: {new Date(chestConfig.updatedAtMs).toLocaleString("pt-BR")}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CHEST_IDS.map((chestId) => {
              const definition = CHEST_DEFINITIONS[chestId];
              const profile = chestConfig.byChest[chestId];

              return (
                <article key={chestId} className="rounded-xl border border-green-900/70 bg-green-950/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.12em] text-green-300">{definition.title}</h3>
                    <span className="rounded border border-green-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-green-600">
                      XP {profile.xpGain}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1">
                    {profile.rewardOdds.map((entry) => (
                      <div key={`${chestId}-${entry.type}`} className="flex items-center justify-between rounded-lg border border-green-950 bg-black/40 px-2 py-1.5 text-xs">
                        <span className="font-semibold text-green-400">{formatDropType(entry.type)}</span>
                        <span className="font-black text-green-200">{entry.weight}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-green-950 bg-black/35 px-2 py-1.5 text-green-500">
                      Moedas: {profile.coinRange.min} - {profile.coinRange.max}
                    </div>
                    <div className="rounded-lg border border-green-950 bg-black/35 px-2 py-1.5 text-green-500">
                      Fragmento: {profile.giftCardFragment.chancePercent}%
                    </div>
                    <div className="rounded-lg border border-green-950 bg-black/35 px-2 py-1.5 text-green-500">
                      Giftcard cheia: {profile.fullGiftCard.chancePercent}%
                    </div>
                    <div className="rounded-lg border border-green-950 bg-black/35 px-2 py-1.5 text-green-500">
                      Account drop: {profile.accountDrop.enabled ? `${profile.accountDrop.chancePercent}%` : "Desativado"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[1.2rem] border border-green-900 bg-black/40 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Rewards Progression</p>
              <h2 className="mt-1 text-lg font-black text-green-200">Tabela de niveis e gasto minimo (rewards)</h2>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700">
              Regra: 1 USD = {XP_PER_USD} XP
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-green-900/70 bg-black/30">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-green-900 text-[11px] font-bold uppercase tracking-[0.12em] text-green-600">
                  <th className="px-3 py-2">Nivel</th>
                  <th className="px-3 py-2">XP acumulado</th>
                  <th className="px-3 py-2">Gasto minimo (USD)</th>
                  <th className="px-3 py-2">Reward</th>
                  <th className="px-3 py-2">Valor recompensa (USD)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: LEVEL_CAP }, (_, index) => {
                  const level = index + 1;
                  const thresholdXp = getXpThresholdForLevel(level);
                  const minUsd = thresholdXp / Math.max(1, XP_PER_USD);
                  const reward = buildLevelReward(level, `admin-items-reward-value-${level}`);
                  const estimatedRewardValue = Object.entries(reward.chestBundle).reduce((sum, [chestId, quantity]) => {
                    if (typeof quantity !== "number" || quantity <= 0) {
                      return sum;
                    }

                    const chestProfile = chestConfig.byChest[chestId as keyof typeof chestConfig.byChest];
                    if (!chestProfile) {
                      return sum;
                    }

                    const averageCoins = (chestProfile.coinRange.min + chestProfile.coinRange.max) / 2;
                    return sum + averageCoins * quantity;
                  }, 0);

                  return (
                    <tr key={level} className={`border-b border-green-950 ${level % 2 === 0 ? "bg-green-950/10" : ""}`}>
                      <td className="px-3 py-2 font-black text-green-300">{level}</td>
                      <td className="px-3 py-2 text-green-400">{thresholdXp.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2 text-green-300">${formatMoneyUsd(minUsd)}</td>
                      <td className="px-3 py-2 text-green-500">{formatRewardBundle(level)}</td>
                      <td className="px-3 py-2 font-semibold text-green-300">~${formatMoneyUsd(estimatedRewardValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <Link
          href="/admin"
          className="mt-6 inline-flex rounded-md border border-green-800 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950"
        >
          Back to admin
        </Link>
      </div>
    </>
  );
}