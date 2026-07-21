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
  cardFee: number;
  cashback: number;
  operationalReserve: number;
  netProfit: number;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export const clampPercent = sharedClampPercent;

export function computeOrderFinancials(
  grossRevenueCents: number,
  supplierPercentageRaw: number,
  cardFeePercentRaw: number,
  cashbackPercentRaw: number,
  operationalReservePercentRaw: number,
): OrderFinancials {
  const grossRevenue = Math.max(0, Math.round(grossRevenueCents));
  const supplierPercentage = clampPercent(supplierPercentageRaw);
  const cardFeePercent = clampPercent(cardFeePercentRaw);
  const cashbackPercent = clampPercent(cashbackPercentRaw);
  const operationalReservePercent = clampPercent(operationalReservePercentRaw);

  const supplierPayout = Math.max(0, Math.round(grossRevenue * (supplierPercentage / 100)));
  const grossProfit = Math.max(0, grossRevenue - supplierPayout);
  const cardFee = Math.max(0, Math.round(grossRevenue * (cardFeePercent / 100)));
  const cashback = Math.max(0, Math.round(grossRevenue * (cashbackPercent / 100)));
  const operationalReserve = Math.max(0, Math.round(grossRevenue * (operationalReservePercent / 100)));
  const netProfit = grossProfit - cardFee - cashback - operationalReserve;

  return {
    supplierPercentage,
    grossRevenue,
    supplierPayout,
    grossProfit,
    cardFee,
    cashback,
    operationalReserve,
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
  );

  return {
    supplierPercentage,
    grossRevenue: asFiniteNumber(record.grossRevenue) ?? computed.grossRevenue,
    supplierPayout: asFiniteNumber(record.supplierPayout) ?? asFiniteNumber(record.sellerAmountCents) ?? computed.supplierPayout,
    grossProfit: asFiniteNumber(record.grossProfit) ?? computed.grossProfit,
    cardFee: asFiniteNumber(record.cardFee) ?? computed.cardFee,
    cashback: asFiniteNumber(record.cashback) ?? computed.cashback,
    operationalReserve: asFiniteNumber(record.operationalReserve) ?? computed.operationalReserve,
    netProfit: asFiniteNumber(record.netProfit) ?? asFiniteNumber(record.platformProfitCents) ?? computed.netProfit,
  };
}
