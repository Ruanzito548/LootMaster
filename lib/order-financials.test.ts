import { describe, expect, it } from "vitest";

import { computeOrderSummaryFinancials } from "./order-financials";

describe("completed order financial summary", () => {
  it("matches the order summary values for a card payment", () => {
    const summary = computeOrderSummaryFinancials({
      totalPaidCents: 104_000,
      paymentMethod: "card",
      supplierPercentage: 73,
      cardFeePercent: 4,
      cashbackPercent: 7,
      operationalReservePercent: 2,
    });

    expect(summary).toMatchObject({
      totalPaid: 104_000,
      goldValue: 100_000,
      supplierPayout: 73_000,
      grossProfit: 27_000,
      gatewayFee: 4_000,
      agentCommission: 0,
      cashback: 7_000,
      operationalReserve: 2_000,
      netProfit: 18_000,
      profitMarginPercent: 18,
    });
  });

  it("does not subtract the already-accounted partner discount twice", () => {
    const summary = computeOrderSummaryFinancials({
      totalPaidCents: 100_000,
      paymentMethod: "pix",
      supplierPercentage: 70,
      cardFeePercent: 4,
      cashbackPercent: 0,
      operationalReservePercent: 0,
      agentCommissionCents: 5_000,
      partnerDiscountCents: 2_000,
    });

    expect(summary.partnerDiscount).toBe(2_000);
    expect(summary.netProfit).toBe(25_000);
  });
});