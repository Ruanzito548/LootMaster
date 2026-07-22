import { describe, expect, it } from "vitest";

import { buildDefaultChestEconomyConfig } from "./chest-economy";
import { buildChestJackpotRecommendation } from "./chest-jackpot-recommendation";

describe("buildChestJackpotRecommendation", () => {
  it("flags the default config as unsafe and suggests conservative multipliers", () => {
    const config = buildDefaultChestEconomyConfig();
    const recommendation = buildChestJackpotRecommendation({
      chestEconomyConfig: config,
      orderValueCents: 10000,
      cashbackPercent: 7,
      chestOpeningsPerOrder: 1,
      monteCarloIterations: 200,
    });

    expect(recommendation.sustainabilityScore).toBe("unsafe");
    expect(recommendation.recommendedTiers[0]?.multiplier).toBe(2);
    expect(recommendation.recommendedTiers[1]?.multiplier).toBe(5);
    expect(recommendation.recommendedTiers[2]?.multiplier).toBe(10);
    expect(recommendation.recommendedTiers[3]?.multiplier).toBe(20);
    expect(recommendation.recommendedTiers.reduce((sum, tier) => sum + tier.probabilityPercent, 0)).toBeCloseTo(100, 5);
  });
});
