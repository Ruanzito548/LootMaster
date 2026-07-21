import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

import type { GiftcardClaimRow } from "@/app/admin/giftcard-claims/giftcard-claims-types";

type GiftcardClaimMode = "open" | "completed";

type TimestampLike = {
  toDate?: () => Date;
};

function normalizeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(10, Math.min(100, parsed));
}

function normalizeMode(value: string | null): GiftcardClaimMode {
  if (value === "completed") {
    return "completed";
  }

  return "open";
}

function normalizeSearch(value: string | null): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function formatTimestamp(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "--";
  }

  const parsed = value as TimestampLike;
  if (typeof parsed.toDate !== "function") {
    return "--";
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("pt-BR");
}

function mapRow(docId: string, data: Record<string, unknown>): GiftcardClaimRow {
  return {
    claimId: docId,
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
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const url = new URL(request.url);
    const mode = normalizeMode(url.searchParams.get("mode"));
    const cursor = url.searchParams.get("cursor")?.trim() || null;
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const search = normalizeSearch(url.searchParams.get("q"));
    const adminDb = getAdminDb();

    let query = adminDb
      .collection("giftcard-claims")
      .where("status", "==", mode)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const cursorRef = adminDb.collection("giftcard-claims").doc(cursor);
      const cursorSnapshot = await cursorRef.get();
      if (cursorSnapshot.exists) {
        query = query.startAfter(cursorSnapshot);
      }
    }

    const snapshot = await query.get();
    const matchingDocs = snapshot.docs.filter((docRow) => {
      if (!search) {
        return true;
      }

      const data = docRow.data() as Record<string, unknown>;
      const username = typeof data.username === "string" ? data.username.toLocaleLowerCase() : "";
      const accountEmail = typeof data.accountEmail === "string" ? data.accountEmail.toLocaleLowerCase() : "";
      const redeemEmail = typeof data.redeemEmail === "string" ? data.redeemEmail.toLocaleLowerCase() : "";
      const giftCardTitle = typeof data.giftCardTitle === "string" ? data.giftCardTitle.toLocaleLowerCase() : "";

      return (
        username.includes(search) ||
        accountEmail.includes(search) ||
        redeemEmail.includes(search) ||
        giftCardTitle.includes(search)
      );
    });

    const startIndex = cursor
      ? Math.max(
          0,
          matchingDocs.findIndex((docRow) => docRow.id === cursor) + 1,
        )
      : 0;

    const pageDocs = matchingDocs.slice(startIndex, startIndex + limit);
    const items = pageDocs.map((docRow) => mapRow(docRow.id, docRow.data() as Record<string, unknown>));
    const nextCursor = startIndex + limit < matchingDocs.length ? pageDocs[pageDocs.length - 1]?.id ?? null : null;

    return Response.json({ items, nextCursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load gift card claims.";
    const status = message.includes("admin") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
