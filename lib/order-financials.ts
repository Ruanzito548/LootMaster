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
  totalPaid: number;
  goldValue: number;
  supplierPayout: number;
  grossProfit: number;
  gatewayFee: number;
  agentCommission: number;
  partnerDiscount: number;
  cashback: number;
  operationalReserve: number;
  netProfit: number;
  profitMarginPercent: number;
};

type OrderSummaryFinancialInput = {
  totalPaidCents: number;
  paymentMethod: string;
  supplierPercentage: number;
  cardFeePercent: number;
  cashbackPercent: number;
  operationalReservePercent: number;
  agentCommissionCents?: number;
  partnerDiscountCents?: number;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export const clampPercent = sharedClampPercent;

export function computeOrderSummaryFinancials({
  totalPaidCents,
  paymentMethod,
  supplierPercentage: supplierPercentageRaw,
  cardFeePercent: cardFeePercentRaw,
  cashbackPercent: cashbackPercentRaw,
  operationalReservePercent: operationalReservePercentRaw,
  agentCommissionCents = 0,
  partnerDiscountCents = 0,
}: OrderSummaryFinancialInput): OrderSummaryFinancials {
  const totalPaid = Math.max(0, Math.round(totalPaidCents));
  const supplierPercentage = clampPercent(supplierPercentageRaw);
  const cardFeePercent = clampPercent(cardFeePercentRaw);
  const cashbackPercent = clampPercent(cashbackPercentRaw);
  const operationalReservePercent = clampPercent(operationalReservePercentRaw);
  const isCardPayment = paymentMethod.trim().toLowerCase() === "card";
  const goldValue = isCardPayment
    ? Math.max(0, Math.round(totalPaid / (1 + cardFeePercent / 100)))
    : totalPaid;
  const supplierPayout = Math.max(0, Math.round(goldValue * (supplierPercentage / 100)));
  const grossProfit = Math.max(0, goldValue - supplierPayout);
  const gatewayFee = Math.max(0, totalPaid - goldValue);
  const agentCommission = Math.max(0, Math.round(agentCommissionCents));
  const partnerDiscount = Math.max(0, Math.round(partnerDiscountCents));
  const cashback = Math.max(0, Math.round(goldValue * (cashbackPercent / 100)));
  const operationalReserve = Math.max(0, Math.round(goldValue * (operationalReservePercent / 100)));
  const netProfit = Math.max(0, grossProfit - agentCommission - cashback - operationalReserve);

  return {
    totalPaid,
    goldValue,
    supplierPayout,
    grossProfit,
    gatewayFee,
    agentCommission,
    partnerDiscount,
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
