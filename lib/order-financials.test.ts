import { describe, expect, it } from "vitest";

import { computeOrderSummaryFinancials, resolveOrderCouponContext } from "./order-financials";

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

  it("keeps the original gold and agent commission when a coupon was used", () => {
    const summary = computeOrderSummaryFinancials({
      totalPaidCents: 93_600,
      goldValueCents: 100_000,
      discountCents: 10_000,
      paymentMethod: "card",
      supplierPercentage: 73,
      cardFeePercent: 4,
      cashbackPercent: 7,
      operationalReservePercent: 2,
      agentCommissionPercent: 50,
    });

    expect(summary).toMatchObject({
      couponUsed: true,
      totalPaid: 93_600,
      goldValue: 100_000,
      gatewayFee: 3_600,
      supplierPayout: 73_000,
      grossProfit: 27_000,
      agentCommission: 13_500,
      cashback: 0,
      operationalReserve: 2_000,
      netProfit: 1_500,
      profitMarginPercent: 1.5,
    });
  });

  it("rebuilds original gold from persisted checkout and fee-transfer fields", () => {
    expect(
      resolveOrderCouponContext(
        { baseProductCents: "90000", agentReferralCode: "AGENT10" },
        { partnerDiscountPartnerCents: "5000", partnerDiscountLootMasterCents: "5000" },
      ),
    ).toEqual({
      couponUsed: true,
      discountCents: 10_000,
      goldValueCents: 100_000,
    });
  });

  it("infers the fixed agent-code discount for legacy checkout records", () => {
    expect(resolveOrderCouponContext({ baseProductCents: 90_000, agentReferralCode: "AGENT10" })).toEqual({
      couponUsed: true,
      discountCents: 10_000,
      goldValueCents: 100_000,
    });
  });
});