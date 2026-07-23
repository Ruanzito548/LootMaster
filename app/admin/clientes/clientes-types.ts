export type ClientRow = {
  uid: string;
  username: string;
  email: string;
  createdAt: string | null;
  lastActivityAt: string | null;
  assignedAgentId: string | null;
  isAgent: boolean;
  agentFeeSharePercent: number;
  agentReferralCode: string;
};

export type AgentRow = {
  uid: string;
  username: string;
  email: string;
  createdAt: string | null;
  lastActivityAt: string | null;
  agentFeeSharePercent: number;
  agentReferralCode: string;
};
