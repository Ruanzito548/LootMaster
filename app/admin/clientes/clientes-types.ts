export type ClientRow = {
  uid: string;
  username: string;
  email: string;
  assignedAgentId: string | null;
  isAgent: boolean;
  agentFeeSharePercent: number;
  agentReferralCode: string;
};

export type AgentRow = {
  uid: string;
  username: string;
  email: string;
  agentFeeSharePercent: number;
  agentReferralCode: string;
};
