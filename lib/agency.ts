export const DEFAULT_PLATFORM_FEE_PERCENT = 15;
export const DEFAULT_AGENT_FEE_SHARE_PERCENT = 50;

export type FeeBreakdown = {
  platformFeeCents: number;
  agentPayoutCents: number;
  lootmasterFeeCents: number;
};

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
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
