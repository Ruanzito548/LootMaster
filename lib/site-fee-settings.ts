export const SITE_FEE_SETTINGS_SCHEMA_VERSION = 1;
export const SITE_FEE_SETTINGS_DOC_ID = "site-fee-settings";

export type SiteFeeSettings = {
  schemaVersion: number;
  updatedAtMs: number;
  supplierDefaultPercent: number;
  cardGatewayFeePercent: number;
  cashbackPercent: number;
  operationalReservePercent: number;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function clampPercent(value: unknown, fallback: number) {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Number(parsed.toFixed(2))));
}

export function buildDefaultSiteFeeSettings(): SiteFeeSettings {
  return {
    schemaVersion: SITE_FEE_SETTINGS_SCHEMA_VERSION,
    updatedAtMs: Date.now(),
    supplierDefaultPercent: 75,
    cardGatewayFeePercent: 2,
    cashbackPercent: 7,
    operationalReservePercent: 3,
  };
}

export function sanitizeSiteFeeSettings(source: unknown): SiteFeeSettings {
  const fallback = buildDefaultSiteFeeSettings();

  if (!source || typeof source !== "object") {
    return fallback;
  }

  const parsed = source as Partial<SiteFeeSettings> & { globalPlatformFeePercent?: number };
  const legacyPlatformFeePercent = clampPercent(parsed.globalPlatformFeePercent, 15);
  const supplierDefaultFallback = 100 - legacyPlatformFeePercent;

  return {
    schemaVersion: SITE_FEE_SETTINGS_SCHEMA_VERSION,
    updatedAtMs: asFiniteNumber(parsed.updatedAtMs) ?? Date.now(),
    supplierDefaultPercent: clampPercent(parsed.supplierDefaultPercent, supplierDefaultFallback),
    cardGatewayFeePercent: clampPercent(parsed.cardGatewayFeePercent, fallback.cardGatewayFeePercent),
    cashbackPercent: clampPercent(parsed.cashbackPercent, fallback.cashbackPercent),
    operationalReservePercent: clampPercent(parsed.operationalReservePercent, fallback.operationalReservePercent),
  };
}
