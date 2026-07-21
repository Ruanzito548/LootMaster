export type FeeTransferRow = {
  id: string;
  orderId: string;
  customerUid: string | null;
  customerEmail: string;
  currency: string;
  amountTotalCents: number;
  commissionPercent: number;
  platformFeeCents: number;
  agentUid: string | null;
  agentFeeSharePercent: number;
  agentPayoutCents: number;
  lootmasterFeeCents: number;
  status: string;
  createdAt: string | null;
};
