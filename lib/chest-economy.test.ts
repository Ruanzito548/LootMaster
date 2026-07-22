import { describe, expect, it } from "vitest";

import { buildDefaultChestEconomyConfig, resolveChestEconomyReward } from "./chest-economy";

describe("resolveChestEconomyReward", () => {
  it("returns a normal reward when no jackpot trigger is selected", () => {
    const config = buildDefaultChestEconomyConfig();
    const state = {
      normalBalanceCents: 1000,
      jackpot20xBalanceCents: 500,
      jackpot200xBalanceCents: 300,
      totalFundedCents: 1800,
      totalDistributedCents: 0,
      totalJackpotAwardsCents: 0,
      updatedAtMs: Date.now(),
    };

    const reward = resolveChestEconomyReward("common", config, state, 75);

    expect(reward).not.toBeNull();
    expect(reward?.poolKey).toBe("normal");
    expect(reward?.amountCents).toBe(5);
  });

  it("returns a jackpot 200x reward when the pool has balance and the random value is inside the configured chance", () => {
    const config = buildDefaultChestEconomyConfig();
    const state = {
      normalBalanceCents: 1000,
      jackpot20xBalanceCents: 500,
      jackpot200xBalanceCents: 5000,
      totalFundedCents: 6500,
      totalDistributedCents: 0,
      totalJackpotAwardsCents: 0,
      updatedAtMs: Date.now(),
    };

    const reward = resolveChestEconomyReward("mythic", config, state, 0);

    expect(reward).not.toBeNull();
    expect(reward?.poolKey).toBe("jackpot200x");
    expect(reward?.amountCents).toBe(1000000);
  });
});
