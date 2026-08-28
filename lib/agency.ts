export const DEFAULT_PLATFORM_FEE_PERCENT = 15;
export const DEFAULT_AGENT_FEE_SHARE_PERCENT = 50;

import { clampPercent } from "./percent-utils";

export type FeeBreakdown = {
  platformFeeCents: number;
  agentPayoutCents: number;
  lootmasterFeeCents: number;
};

export function computeFeeBreakdownFromNetRevenue(
  netRevenueCents: number,
  supplierPayoutCents: number,
  agentFeeSharePercentRaw: number,
): FeeBreakdown {
  const netRevenue = Math.max(0, Math.round(netRevenueCents));
  const supplierPayout = Math.max(0, Math.round(supplierPayoutCents));
  const commissionBaseCents = Math.max(0, netRevenue - supplierPayout);
  const agentFeeSharePercent = clampPercent(agentFeeSharePercentRaw);
  const agentPayoutCents = Math.max(0, Math.round(commissionBaseCents * (agentFeeSharePercent / 100)));
  const lootmasterFeeCents = Math.max(0, commissionBaseCents - agentPayoutCents);

  return {
    platformFeeCents: commissionBaseCents,
    agentPayoutCents,
    lootmasterFeeCents,
  };
}

export function computeFeeBreakdown(
  totalCents: number,
  commissionPercentRaw: number,
  agentFeeSharePercentRaw: number,
): FeeBreakdown {
  const amountCents = Math.max(0, Math.round(totalCents));
  const commissionPercent = clampPercent(commissionPercentRaw);
  const agentFeeSharePercent = clampPercent(agentFeeSharePercentRaw);

  const platformFeeCents = Math.max(0, Math.round(amountCents * (commissionPercent / 100)));
  const agentPayoutCents = Math.max(0, Math.round(platformFeeCents * (agentFeeSharePercent / 100)));
  const lootmasterFeeCents = Math.max(0, platformFeeCents - agentPayoutCents);

  return {
    platformFeeCents,
    agentPayoutCents,
    lootmasterFeeCents,
  };
}

export function normalizeAgentCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function buildAgentReferralCode(uid: string): string {
  const safe = uid.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!safe) {
    return "AGENT";
  }

  if (safe.length <= 12) {
    return safe;
  }

  return `${safe.slice(0, 6)}${safe.slice(-6)}`;
}
