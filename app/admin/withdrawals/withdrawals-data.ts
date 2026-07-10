import { getAdminDb } from "@/lib/firebase-admin";

export type WithdrawalRow = {
  requestId: string;
  uid: string;
  email: string;
  amount: number;
  payoutMethod: string;
  payoutReference: string;
  status: string;
  createdAtLabel: string;
  reviewedAtLabel: string;
};

function formatTimestamp(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "--";
  }

  const parsed = value as { toDate?: () => Date };
  if (typeof parsed.toDate !== "function") {
    return "--";
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-US");
}

export async function loadWithdrawalRows() {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("withdraw-requests")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  return snapshot.docs.map((docRow) => {
    const data = docRow.data() as Record<string, unknown>;
    return {
      requestId: docRow.id,
      uid: typeof data.uid === "string" ? data.uid : "",
      email: typeof data.email === "string" ? data.email : "",
      amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : 0,
      payoutMethod: typeof data.payoutMethod === "string" ? data.payoutMethod : "--",
      payoutReference: typeof data.payoutReference === "string" ? data.payoutReference : "--",
      status: typeof data.status === "string" ? data.status : "pending_review",
      createdAtLabel: formatTimestamp(data.createdAt),
      reviewedAtLabel: formatTimestamp(data.reviewedAt),
    } satisfies WithdrawalRow;
  });
}
