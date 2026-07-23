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
      wallets: {
        normal: { allocationPercent: 80, activationChancePercent: 100, minimumWalletReservePercent: 5, payoutTiers: [{ payoutPercent: 6, probabilityPercent: 100 }] },
        jackpotCommon: { allocationPercent: 15, activationChancePercent: 8, minimumWalletReservePercent: 10, payoutTiers: [{ payoutPercent: 10, probabilityPercent: 100 }] },
        jackpotRare: { allocationPercent: 5, activationChancePercent: 2, minimumWalletReservePercent: 20, payoutTiers: [{ payoutPercent: 30, probabilityPercent: 100 }] },
      },
    });

    expect(sanitized.wallets.normal.allocationPercent).toBe(80);
    expect(sanitized.wallets.jackpotCommon.activationChancePercent).toBe(8);
    expect(sanitized.wallets.jackpotRare.payoutTiers[0]?.payoutPercent).toBe(30);
  });

  it("uses payout tiers and reserve rules to avoid invalid payout amounts", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    const fundedState = fundChestWalletEconomyFromCashback(state, 5, config);

    const reward = resolveChestWalletReward("common", config, fundedState, 50);

    expect(reward?.walletKey).toBe("normal");
    expect(reward?.amountUsd).toBeLessThanOrEqual(0.05);
  });
});
