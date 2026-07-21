import { ADMIN_GIFTCARD_CLAIMS_QUERY_LIMIT } from "@/lib/admin-query-limits";
import { getAdminDb } from "@/lib/firebase-admin";

export type GiftcardClaimRow = {
  claimId: string;
  uid: string;
  username: string;
  accountEmail: string;
  redeemEmail: string;
  country: string;
  giftCardItemId: string;
  giftCardTitle: string;
  status: string;
  createdAtLabel: string;
  completedAtLabel: string;
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

  return date.toLocaleString("pt-BR");
}

export async function loadGiftcardClaimRows(): Promise<GiftcardClaimRow[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("giftcard-claims")
    .orderBy("createdAt", "desc")
    .limit(ADMIN_GIFTCARD_CLAIMS_QUERY_LIMIT)
    .get();

  return snapshot.docs.map((row) => {
    const data = row.data() as Record<string, unknown>;

    return {
      claimId: row.id,
      uid: typeof data.uid === "string" ? data.uid : "",
      username: typeof data.username === "string" ? data.username : "",
      accountEmail: typeof data.accountEmail === "string" ? data.accountEmail : "",
      redeemEmail: typeof data.redeemEmail === "string" ? data.redeemEmail : "",
      country: typeof data.country === "string" ? data.country : "",
      giftCardItemId: typeof data.giftCardItemId === "string" ? data.giftCardItemId : "",
      giftCardTitle: typeof data.giftCardTitle === "string" ? data.giftCardTitle : "Gift Card",
      status: typeof data.status === "string" ? data.status : "open",
      createdAtLabel: formatTimestamp(data.createdAt),
      completedAtLabel: formatTimestamp(data.completedAt),
    } satisfies GiftcardClaimRow;
  });
}
