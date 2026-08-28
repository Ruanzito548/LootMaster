export type WithdrawalRow = {
  requestId: string;
  uid: string;
  email: string;
  fullName: string;
  amount: number;
  payoutMethod: string;
  payoutReference: string;
  status: string;
  createdAtLabel: string;
  reviewedAtLabel: string;
};
