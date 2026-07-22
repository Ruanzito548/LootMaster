import { describe, expect, it } from "vitest";

import {
  buildDefaultChestWalletEconomyConfig,
  buildDefaultChestWalletEconomyState,
  fundChestWalletEconomyFromCashback,
  resolveChestWalletReward,
  applyChestWalletReward,
  sanitizeChestWalletEconomyConfig,
} from "./chest-wallet-economy";

describe("chest wallet economy", () => {
  it("distributes cashback proportionally across the configured wallets", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();

    const nextState = fundChestWalletEconomyFromCashback(state, 7, config);

    expect(nextState.wallets.normal.balanceUsd).toBeCloseTo(4.9, 5);
    expect(nextState.wallets.jackpotCommon.balanceUsd).toBeCloseTo(1.75, 5);
    expect(nextState.wallets.jackpotRare.balanceUsd).toBeCloseTo(0.35, 5);
  });

  it("pays a jackpot from the configured wallet percentage and debits it", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    const fundedState = fundChestWalletEconomyFromCashback(state, 20, config);

    const reward = resolveChestWalletReward("common", config, fundedState, 0);
    const nextState = reward ? applyChestWalletReward(fundedState, reward) : fundedState;

    expect(reward?.type).toBe("jackpot-common");
    expect(reward?.amountUsd).toBeCloseTo(0.25, 5);
    expect(nextState.wallets.jackpotCommon.balanceUsd).toBeCloseTo(4.75, 5);
  });

  it("sanitizes wallet economy configs and preserves valid values", () => {
    const sanitized = sanitizeChestWalletEconomyConfig({
      jackpotCommonChancePercent: 12,
      jackpotRareChancePercent: 3,
      wallets: {
        normal: { allocationPercent: 80, rewardProbabilityPercent: 100, rewardPercentages: [6], safetyBufferPercent: 5 },
        jackpotCommon: { allocationPercent: 15, rewardProbabilityPercent: 8, rewardPercentages: [10], safetyBufferPercent: 10 },
        jackpotRare: { allocationPercent: 5, rewardProbabilityPercent: 2, rewardPercentages: [30], safetyBufferPercent: 20 },
      },
    });

    expect(sanitized.jackpotCommonChancePercent).toBe(12);
    expect(sanitized.jackpotRareChancePercent).toBe(3);
    expect(sanitized.wallets.normal.allocationPercent).toBe(80);
    expect(sanitized.wallets.jackpotCommon.rewardPercentages[0]).toBe(10);
  });
});
