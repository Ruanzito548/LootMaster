import { describe, expect, it } from "vitest";

import { buildDefaultChestEconomyConfig, resolveChestEconomyReward } from "./chest-economy";
import { getChestImagePath } from "./chests";

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

describe("getChestImagePath", () => {
  it("maps every chest rarity to its corresponding public asset", () => {
    expect(getChestImagePath("common")).toBe("/baus/comum.png");
    expect(getChestImagePath("uncommon")).toBe("/baus/incomum.png");
    expect(getChestImagePath("rare")).toBe("/baus/raro.png");
    expect(getChestImagePath("epic")).toBe("/baus/epico.png");
    expect(getChestImagePath("legendary")).toBe("/baus/lendario.png");
    expect(getChestImagePath("mythic")).toBe("/baus/mitico.png");
  });
});
