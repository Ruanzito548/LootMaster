import { buildDefaultChestEconomyConfig, type ChestEconomyConfig } from "./chest-economy";
import { CHEST_EXPECTED_VALUE_USD, type ChestId } from "./chest-loot";

export type JackpotTierRecommendation = {
  multiplier: number;
  probabilityPercent: number;
  expectedContributionPercent: number;
  rationale: string;
};

export type JackpotRecommendation = {
  sustainabilityScore: "safe" | "warning" | "unsafe";
  suggestedCashbackPercent: number;
  suggestedReservePercent: number;
  suggestedNormalRewardPercent: number;
  suggestedJackpot20xPercent: number;
  suggestedJackpot200xPercent: number;
  recommendedTiers: JackpotTierRecommendation[];
  suggestedWalletPercentages: Array<{ percentOfWallet: number; probabilityPercent: number }>;
  summary: string;
  monteCarlo: {
    iterations: number;
    positiveBalanceRate: number;
    averageWalletBalanceRatio: number;
    worstCaseBalanceRatio: number;
  };
};

type RecommendationInput = {
  chestEconomyConfig?: ChestEconomyConfig;
  orderValueCents?: number;
  cashbackPercent?: number;
  chestOpeningsPerOrder?: number;
  monteCarloIterations?: number;
};

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function roundPercent(value: number): number {
  return Number(value.toFixed(2));
}

function estimateChestOpenValueCents(chestId: ChestId): number {
  const usd = CHEST_EXPECTED_VALUE_USD[chestId] ?? 1;
  return Math.round(usd * 100);
}

function buildTierDistribution(config: ChestEconomyConfig) {
  const base = [
    { multiplier: 2, probabilityPercent: 70, rationale: "Recompensa frequente para manter a sensação de ganho" },
    { multiplier: 5, probabilityPercent: 20, rationale: "Premiação maior sem comprometer demasiado o fundo" },
    { multiplier: 10, probabilityPercent: 8, rationale: "Jackpot intermediário para reforçar o valor percebido" },
    { multiplier: 20, probabilityPercent: 2, rationale: "Premiação rara e de alto impacto" },
  ];

  const reservePercent = clampPercent(config.jackpot20xPercent + config.jackpot200xPercent, 2);
  if (reservePercent >= 6) {
    return [
      { multiplier: 2, probabilityPercent: 78, rationale: "Muito fundo disponível, então a recompensa frequente deve ser dominante" },
      { multiplier: 5, probabilityPercent: 15, rationale: "Jackpot médio com boa frequência" },
      { multiplier: 10, probabilityPercent: 5, rationale: "Premiação rara e maior" },
      { multiplier: 20, probabilityPercent: 2, rationale: "Jackpot raro para manter o drama" },
    ];
  }

  if (reservePercent <= 1.5) {
    return [
      { multiplier: 2, probabilityPercent: 60, rationale: "Reserva baixa exige mais cautela" },
      { multiplier: 5, probabilityPercent: 25, rationale: "Premiação maior ainda compatível" },
      { multiplier: 10, probabilityPercent: 10, rationale: "Bônus intermediário para sensação de recompensa" },
      { multiplier: 20, probabilityPercent: 5, rationale: "Jackpot raro, mas com impacto" },
    ];
  }

  return base;
}

export function buildChestJackpotRecommendation(input: RecommendationInput): JackpotRecommendation {
  const config = input.chestEconomyConfig ?? buildDefaultChestEconomyConfig();
  const orderValueCents = clampNonNegative(input.orderValueCents ?? 10000);
  const cashbackPercent = clampPercent(input.cashbackPercent ?? 7, 7);
  const chestOpeningsPerOrder = Math.max(1, Math.round(input.chestOpeningsPerOrder ?? 1));
  const iterations = Math.max(100, Math.round(input.monteCarloIterations ?? 2000));

  const suggestedCashbackPercent = clampPercent(cashbackPercent + 0.5, cashbackPercent + 0.5);
  const suggestedReservePercent = clampPercent(config.jackpot20xPercent + config.jackpot200xPercent + 1, 2);
  const suggestedNormalRewardPercent = clampPercent(config.normalRewardPercent + 0.5, 5.5);
  const suggestedJackpot20xPercent = clampPercent(config.jackpot20xPercent + 0.5, 1.5);
  const suggestedJackpot200xPercent = clampPercent(config.jackpot200xPercent + 0.5, 1.5);

  const tiers = buildTierDistribution(config).map((tier) => ({
    multiplier: tier.multiplier,
    probabilityPercent: roundPercent(tier.probabilityPercent),
    expectedContributionPercent: roundPercent((tier.probabilityPercent / 100) * tier.multiplier),
    rationale: tier.rationale,
  }));

  const openingValueCents = Math.max(1, estimateChestOpenValueCents("common"));
  const expectedCashbackReserveCents = Math.round(orderValueCents * (suggestedReservePercent / 100));

  let positiveBalanceRate = 1;
  let averageWalletBalanceRatio = 1;
  let worstCaseBalanceRatio = 1;

  for (let index = 0; index < iterations; index += 1) {
    let walletBalanceCents = expectedCashbackReserveCents;

    for (let opening = 0; opening < Math.max(1, chestOpeningsPerOrder * 100); opening += 1) {
      const randomRoll = Math.random() * 100;
      let selectedTier = tiers[0];
      let cumulative = 0;

      for (const tier of tiers) {
        cumulative += tier.probabilityPercent;
        if (randomRoll <= cumulative) {
          selectedTier = tier;
          break;
        }
      }

      const payout = Math.round(openingValueCents * selectedTier.multiplier);
      walletBalanceCents -= payout;

      if (walletBalanceCents < 0) {
        break;
      }
    }

    if (walletBalanceCents >= 0) {
      positiveBalanceRate += 1;
    }

    averageWalletBalanceRatio += walletBalanceCents / Math.max(1, expectedCashbackReserveCents);
    worstCaseBalanceRatio = Math.min(worstCaseBalanceRatio, walletBalanceCents / Math.max(1, expectedCashbackReserveCents));
  }

  positiveBalanceRate = positiveBalanceRate / iterations;
  averageWalletBalanceRatio = averageWalletBalanceRatio / iterations;
  worstCaseBalanceRatio = worstCaseBalanceRatio / iterations;

  let sustainabilityScore: JackpotRecommendation["sustainabilityScore"] = "safe";
  if (positiveBalanceRate < 0.9 || averageWalletBalanceRatio < 0.7 || worstCaseBalanceRatio < 0.4) {
    sustainabilityScore = "unsafe";
  } else if (positiveBalanceRate < 0.95 || averageWalletBalanceRatio < 0.85) {
    sustainabilityScore = "warning";
  }

  return {
    sustainabilityScore,
    suggestedCashbackPercent: roundPercent(suggestedCashbackPercent),
    suggestedReservePercent: roundPercent(suggestedReservePercent),
    suggestedNormalRewardPercent: roundPercent(suggestedNormalRewardPercent),
    suggestedJackpot20xPercent: roundPercent(suggestedJackpot20xPercent),
    suggestedJackpot200xPercent: roundPercent(suggestedJackpot200xPercent),
    recommendedTiers: tiers,
    suggestedWalletPercentages: [
      { percentOfWallet: 5, probabilityPercent: 65 },
      { percentOfWallet: 10, probabilityPercent: 20 },
      { percentOfWallet: 20, probabilityPercent: 10 },
      { percentOfWallet: 40, probabilityPercent: 4 },
      { percentOfWallet: 60, probabilityPercent: 1 },
    ],
    summary: `A reserva recomendada é ${roundPercent(suggestedReservePercent)}% do cashback, com jackpots curtos e frequentes para manter o valor percebido sem esgotar o fundo.`,
    monteCarlo: {
      iterations,
      positiveBalanceRate: roundPercent(positiveBalanceRate * 100),
      averageWalletBalanceRatio: roundPercent(averageWalletBalanceRatio * 100),
      worstCaseBalanceRatio: roundPercent(worstCaseBalanceRatio * 100),
    },
  };
}
