import { clampPercent as sharedClampPercent } from "./percent-utils";

export type FinancialSettings = {
  supplierDefaultPercent: number;
  cardGatewayFeePercent: number;
  cashbackPercent: number;
  operationalReservePercent: number;
};

export type OrderFinancials = {
  supplierPercentage: number;
  grossRevenue: number;
  supplierPayout: number;
  grossProfit: number;
  cardFeePercent: number;
  cardFee: number;
  cashbackPercent: number;
  cashback: number;
  operationalReserve: number;
  operationalReservePercent: number;
  netProfit: number;
};

export type OrderSummaryFinancials = {
  couponUsed: boolean;
  totalPaid: number;
  goldValue: number;
  supplierPayout: number;
  grossProfit: number;
  gatewayFee: number;
  agentCommission: number;
  cashback: number;
  operationalReserve: number;
  netProfit: number;
  profitMarginPercent: number;
};

type OrderSummaryFinancialInput = {
  totalPaidCents: number;
  goldValueCents?: number;
  discountCents?: number;
  couponUsed?: boolean;
  paymentMethod: string;
  supplierPercentage: number;
  cardFeePercent: number;
  cashbackPercent: number;
  operationalReservePercent: number;
  agentCommissionPercent?: number;
};

export type OrderCouponContext = {
  couponUsed: boolean;
  discountCents: number;
  goldValueCents?: number;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export const clampPercent = sharedClampPercent;

export function resolveOrderCouponContext(
  order: Record<string, unknown>,
  feeTransfer: Record<string, unknown> = {},
): OrderCouponContext {
  const directDiscount = asFiniteNumber(order.partnerDiscountCents) ?? asFiniteNumber(feeTransfer.partnerDiscountCents);
  const splitDiscount =
    (asFiniteNumber(order.partnerDiscountPartnerCents) ?? asFiniteNumber(feeTransfer.partnerDiscountPartnerCents) ?? 0) +
    (asFiniteNumber(order.partnerDiscountLootMasterCents) ?? asFiniteNumber(feeTransfer.partnerDiscountLootMasterCents) ?? 0);
  const referralCode =
    typeof order.agentReferralCode === "string"
      ? order.agentReferralCode.trim()
      : typeof feeTransfer.agentReferralCode === "string"
        ? feeTransfer.agentReferralCode.trim()
        : "";
  const discountedGoldValue = asFiniteNumber(order.baseProductCents) ?? asFiniteNumber(order.baseAmountCents);
  const recordedDiscount = directDiscount ?? splitDiscount;
  const inferredDiscount =
    recordedDiscount <= 0 && referralCode && discountedGoldValue !== null
      ? Math.max(0, Math.round(discountedGoldValue / 0.9) - Math.round(discountedGoldValue))
      : 0;
  const discountCents = Math.max(0, Math.round(recordedDiscount || inferredDiscount));

  return {
    couponUsed: discountCents > 0 || referralCode.length > 0,
    discountCents,
    goldValueCents:
      discountedGoldValue !== null
        ? Math.max(0, Math.round(discountedGoldValue + discountCents))
        : undefined,
  };
}

export function computeOrderSummaryFinancials({
  totalPaidCents,
  goldValueCents,
  discountCents = 0,
  couponUsed: couponUsedRaw,
  paymentMethod,
  supplierPercentage: supplierPercentageRaw,
  cardFeePercent: cardFeePercentRaw,
  cashbackPercent: cashbackPercentRaw,
  operationalReservePercent: operationalReservePercentRaw,
  agentCommissionPercent: agentCommissionPercentRaw = 0,
}: OrderSummaryFinancialInput): OrderSummaryFinancials {
  const totalPaid = Math.max(0, Math.round(totalPaidCents));
  const discount = Math.max(0, Math.round(discountCents));
  const couponUsed = couponUsedRaw ?? discount > 0;
  const supplierPercentage = clampPercent(supplierPercentageRaw);
  const cardFeePercent = clampPercent(cardFeePercentRaw);
  const cashbackPercent = clampPercent(cashbackPercentRaw);
  const operationalReservePercent = clampPercent(operationalReservePercentRaw);
  const agentCommissionPercent = clampPercent(agentCommissionPercentRaw);
  const isCardPayment = paymentMethod.trim().toLowerCase() === "card";
  const discountedGoldValue = isCardPayment
    ? Math.max(0, Math.round(totalPaid / (1 + cardFeePercent / 100)))
    : Math.max(0, totalPaid);
  const goldValue = typeof goldValueCents === "number" && Number.isFinite(goldValueCents)
    ? Math.max(0, Math.round(goldValueCents))
    : discountedGoldValue + discount;
  const payableGoldValue = Math.max(0, goldValue - discount);
  const gatewayFee = isCardPayment ? Math.max(0, totalPaid - payableGoldValue) : 0;
  const netRevenue = Math.max(0, totalPaid - gatewayFee);
  const supplierPayout = Math.max(0, Math.round(goldValue * (supplierPercentage / 100)));
  const grossProfit = Math.max(0, goldValue - supplierPayout);
  const agentCommission = Math.max(0, Math.round(grossProfit * (agentCommissionPercent / 100)));
  const cashback = couponUsed ? 0 : Math.max(0, Math.round(goldValue * (cashbackPercent / 100)));
  const operationalReserve = Math.max(0, Math.round(goldValue * (operationalReservePercent / 100)));
  const netProfit = Math.max(0, netRevenue - supplierPayout - agentCommission - cashback - operationalReserve);

  return {
    couponUsed,
    totalPaid,
    goldValue,
    supplierPayout,
    grossProfit,
    gatewayFee,
    agentCommission,
    cashback,
    operationalReserve,
    netProfit,
    profitMarginPercent: goldValue > 0 ? (netProfit / goldValue) * 100 : 0,
  };
}

export function computeOrderFinancials(
  grossRevenueCents: number,
  supplierPercentageRaw: number,
  cardFeePercentRaw: number,
  cashbackPercentRaw: number,
  operationalReservePercentRaw: number,
    cardFeeBaseCents = grossRevenueCents,
    costBaseCents = grossRevenueCents,
): OrderFinancials {
  const grossRevenue = Math.max(0, Math.round(grossRevenueCents));
  const supplierPercentage = clampPercent(supplierPercentageRaw);
  const cardFeePercent = clampPercent(cardFeePercentRaw);
  const cashbackPercent = clampPercent(cashbackPercentRaw);
  const operationalReservePercent = clampPercent(operationalReservePercentRaw);

  const supplierPayout = Math.max(0, Math.round(grossRevenue * (supplierPercentage / 100)));
  const grossProfit = Math.max(0, grossRevenue - supplierPayout);
  const cardFeeBase = Math.max(0, Math.round(cardFeeBaseCents));
    const costBase = Math.max(0, Math.round(costBaseCents));
  const cardFee = Math.max(0, Math.round(cardFeeBase * (cardFeePercent / 100)));
    const cashback = Math.max(0, Math.round(costBase * (cashbackPercent / 100)));
    const operationalReserve = Math.max(0, Math.round(costBase * (operationalReservePercent / 100)));
  const netProfit = grossProfit - cardFee - cashback - operationalReserve;

  return {
    supplierPercentage,
    grossRevenue,
    supplierPayout,
    grossProfit,
    cardFeePercent,
    cardFee,
    cashbackPercent,
    cashback,
    operationalReserve,
    operationalReservePercent,
    netProfit,
  };
}

export function resolveSupplierPercentage(record: Record<string, unknown>, fallbackPercent: number) {
  const supplierPercentage = asFiniteNumber(record.supplierPercentage);
  if (supplierPercentage !== null) {
    return clampPercent(supplierPercentage);
  }

  const legacyFeePercentage = asFiniteNumber(record.feePercentage);
  if (legacyFeePercentage !== null) {
    return clampPercent(legacyFeePercentage);
  }

  const legacyCommissionPercent = asFiniteNumber(record.commissionPercent);
  if (legacyCommissionPercent !== null) {
    return clampPercent(legacyCommissionPercent);
  }

  return clampPercent(fallbackPercent);
}

export function buildOrderFinancialSnapshot(
  record: Record<string, unknown>,
  defaults: FinancialSettings,
): OrderFinancials {
  const grossRevenue =
    asFiniteNumber(record.grossRevenue) ??
    asFiniteNumber(record.amountTotalCents) ??
    asFiniteNumber(record.finalAmountCents) ??
    0;

  const supplierPercentage = resolveSupplierPercentage(record, defaults.supplierDefaultPercent);
  const cardFeePercent = asFiniteNumber(record.cardFeePercent) ?? defaults.cardGatewayFeePercent;
  const cashbackPercent = asFiniteNumber(record.cashbackPercent) ?? defaults.cashbackPercent;
  const operationalReservePercent =
    asFiniteNumber(record.operationalReservePercent) ?? defaults.operationalReservePercent;

  const computed = computeOrderFinancials(
    grossRevenue,
    supplierPercentage,
    cardFeePercent,
    cashbackPercent,
    operationalReservePercent,
      asFiniteNumber(record.baseProductCents) ?? grossRevenue,
      asFiniteNumber(record.baseProductCents) ?? grossRevenue,
  );

  return {
    supplierPercentage,
    grossRevenue: asFiniteNumber(record.grossRevenue) ?? computed.grossRevenue,
    supplierPayout: asFiniteNumber(record.supplierPayout) ?? asFiniteNumber(record.sellerAmountCents) ?? computed.supplierPayout,
    grossProfit: asFiniteNumber(record.grossProfit) ?? computed.grossProfit,
    cardFeePercent,
    cardFee: asFiniteNumber(record.cardFee) ?? computed.cardFee,
    cashbackPercent,
    cashback: asFiniteNumber(record.cashback) ?? computed.cashback,
    operationalReservePercent,
    operationalReserve: asFiniteNumber(record.operationalReserve) ?? computed.operationalReserve,
    netProfit: asFiniteNumber(record.netProfit) ?? asFiniteNumber(record.platformProfitCents) ?? computed.netProfit,
  };
}
