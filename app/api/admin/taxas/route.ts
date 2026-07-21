import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

import type { FeeTransferRow } from "@/app/admin/taxas/taxas-types";

type TimestampLike = {
  toDate?: () => Date;
};

function serializeTimestamp(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as TimestampLike;
  if (typeof parsed.toDate !== "function") {
    return null;
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(10, Math.min(100, parsed));
}

function mapFeeTransferRow(docId: string, data: Record<string, unknown>): FeeTransferRow {
  return {
    id: docId,
    orderId: typeof data.orderId === "string" ? data.orderId : docId,
    customerUid: typeof data.customerUid === "string" ? data.customerUid : null,
    customerEmail: typeof data.customerEmail === "string" ? data.customerEmail : "",
    currency: typeof data.currency === "string" ? data.currency : "USD",
    amountTotalCents: typeof data.amountTotalCents === "number" ? data.amountTotalCents : 0,
    commissionPercent: typeof data.commissionPercent === "number" ? data.commissionPercent : 15,
    platformFeeCents: typeof data.platformFeeCents === "number" ? data.platformFeeCents : 0,
    agentUid: typeof data.agentUid === "string" ? data.agentUid : null,
    agentFeeSharePercent: typeof data.agentFeeSharePercent === "number" ? data.agentFeeSharePercent : 0,
    agentPayoutCents: typeof data.agentPayoutCents === "number" ? data.agentPayoutCents : 0,
    lootmasterFeeCents: typeof data.lootmasterFeeCents === "number" ? data.lootmasterFeeCents : 0,
    status: typeof data.status === "string" ? data.status : "unknown",
    createdAt: serializeTimestamp(data.createdAt),
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor")?.trim() || null;
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const adminDb = getAdminDb();

    let query = adminDb.collection("fee-transfers").orderBy("createdAt", "desc").limit(limit);

    if (cursor) {
      const cursorRef = adminDb.collection("fee-transfers").doc(cursor);
      const cursorSnapshot = await cursorRef.get();
      if (cursorSnapshot.exists) {
        query = query.startAfter(cursorSnapshot);
      }
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map((docRow) => mapFeeTransferRow(docRow.id, docRow.data() as Record<string, unknown>));
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;

    return Response.json({ items, nextCursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load fee transfers.";
    const status = message.includes("admin") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
