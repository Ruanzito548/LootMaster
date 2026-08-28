import { describe, expect, it } from "vitest";

import { computeFeeBreakdownFromNetRevenue } from "./agency";

describe("computeFeeBreakdownFromNetRevenue", () => {
  it("applies the partner share to the amount left after gateway and supplier", () => {
    const breakdown = computeFeeBreakdownFromNetRevenue(40.47 * 100, 29.57 * 100, 30);

    expect(breakdown.platformFeeCents).toBe(1090);
    expect(breakdown.agentPayoutCents).toBe(327);
    expect(breakdown.lootmasterFeeCents).toBe(763);
  });

  it("does not produce a commission when the supplier exceeds net revenue", () => {
    expect(computeFeeBreakdownFromNetRevenue(1000, 1001, 30).agentPayoutCents).toBe(0);
  });
});
