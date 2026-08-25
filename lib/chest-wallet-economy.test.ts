import { describe, expect, it } from "vitest";

import {
  buildDefaultChestWalletEconomyConfig,
  buildDefaultChestWalletEconomyState,
  fundChestWalletEconomyFromCashback,
  resolveChestWalletRewards,
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

  it("pays jackpot common using chest rarity percentage", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    state.wallets.jackpotCommon.balanceUsd = 10;
    state.wallets.normal.balanceUsd = 0;
    state.wallets.jackpotRare.balanceUsd = 0;

    const rewards = resolveChestWalletRewards("common", config, state, { jackpotCommon: 0 });
    const reward = rewards[0];
    const nextState = reward ? applyChestWalletReward(state, reward) : state;

    expect(reward?.type).toBe("jackpot-common");
    expect(reward?.percentOfWallet).toBe(1);
    expect(reward?.amountUsd).toBeCloseTo(0.1, 5);
    expect(nextState.wallets.jackpotCommon.balanceUsd).toBeCloseTo(9.9, 5);
  });

  it("pays jackpot rare using chest rarity percentage and never reaches 100%", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    state.wallets.jackpotRare.balanceUsd = 20;
    state.wallets.normal.balanceUsd = 0;
    state.wallets.jackpotCommon.balanceUsd = 0;

    const rewards = resolveChestWalletRewards("mythic", config, state, { jackpotRare: 0 });
    const reward = rewards[0];

    expect(reward?.type).toBe("jackpot-rare");
    expect(reward?.percentOfWallet).toBe(75);
    expect(reward?.amountUsd).toBeCloseTo(15, 5);
  });

  it("returns no rewards when both jackpot rolls miss", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    state.wallets.jackpotCommon.balanceUsd = 10;
    state.wallets.jackpotRare.balanceUsd = 10;

    const rewards = resolveChestWalletRewards("mythic", config, state, { jackpotCommon: 90, jackpotRare: 90 });

    expect(rewards).toHaveLength(0);
  });

  it("pays jackpot rare when its own roll hits, regardless of the common roll", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    state.wallets.jackpotCommon.balanceUsd = 10;
    state.wallets.jackpotRare.balanceUsd = 10;

    const rewards = resolveChestWalletRewards("rare", config, state, { jackpotCommon: 90, jackpotRare: 0.01 });

    expect(rewards).toHaveLength(1);
    expect(rewards[0]?.walletKey).toBe("jackpotRare");
    expect(rewards[0]?.percentOfWallet).toBe(10);
    expect(rewards[0]?.amountUsd).toBeCloseTo(1, 5);
  });

  it("pays both common and rare jackpots when both rolls hit on the same chest", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    state.wallets.jackpotCommon.balanceUsd = 10;
    state.wallets.jackpotRare.balanceUsd = 10;

    const rewards = resolveChestWalletRewards("rare", config, state, { jackpotCommon: 0, jackpotRare: 0 });

    expect(rewards).toHaveLength(2);
    expect(rewards.map((reward) => reward.walletKey).sort()).toEqual(["jackpotCommon", "jackpotRare"]);
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

  it("does not pay extra reward from normal wallet", () => {
    const config = buildDefaultChestWalletEconomyConfig();
    const state = buildDefaultChestWalletEconomyState();
    state.wallets.normal.balanceUsd = 1;
    state.wallets.jackpotCommon.balanceUsd = 0;
    state.wallets.jackpotRare.balanceUsd = 0;

    const rewards = resolveChestWalletRewards("common", config, state, { jackpotCommon: 50, jackpotRare: 50 });

    expect(rewards).toHaveLength(0);
  });
});
