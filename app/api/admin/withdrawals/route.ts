import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

import type { WithdrawalRow } from "@/app/admin/withdrawals/withdrawals-types";

type TimestampLike = {
  toDate?: () => Date;
};

type WithdrawalStatusFilter = "pending_review" | "approved" | "rejected";

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

function formatTimestamp(value: unknown): string {
  const iso = serializeTimestamp(value);
  if (!iso) {
    return "--";
  }

  return new Date(iso).toLocaleString("pt-BR");
}

function normalizeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(10, Math.min(100, parsed));
}

function normalizeStatus(value: string | null): WithdrawalStatusFilter {
  if (value === "approved" || value === "rejected") {
    return value;
  }

  return "pending_review";
}

function mapRow(docId: string, data: Record<string, unknown>): WithdrawalRow {
  return {
    requestId: docId,
    uid: typeof data.uid === "string" ? data.uid : "",
    email: typeof data.email === "string" ? data.email : "",
    amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : 0,
    payoutMethod: typeof data.payoutMethod === "string" ? data.payoutMethod : "--",
    payoutReference: typeof data.payoutReference === "string" ? data.payoutReference : "--",
    status: typeof data.status === "string" ? data.status : "pending_review",
    createdAtLabel: formatTimestamp(data.createdAt),
    reviewedAtLabel: formatTimestamp(data.reviewedAt),
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor")?.trim() || null;
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const status = normalizeStatus(url.searchParams.get("status"));
    const adminDb = getAdminDb();

    let query = adminDb.collection("withdraw-requests").orderBy("createdAt", "desc").limit(500);

    if (cursor) {
      const cursorRef = adminDb.collection("withdraw-requests").doc(cursor);
      const cursorSnapshot = await cursorRef.get();
      if (cursorSnapshot.exists) {
        query = query.startAfter(cursorSnapshot);
      }
    }

    const snapshot = await query.get();
    const matchingDocs = snapshot.docs.filter((docRow) => {
      const data = docRow.data() as Record<string, unknown>;
      return (typeof data.status === "string" ? data.status : "pending_review") === status;
    });
    const pageDocs = matchingDocs.slice(0, limit);
    const items = pageDocs.map((docRow) => mapRow(docRow.id, docRow.data() as Record<string, unknown>));
    const nextCursor = snapshot.docs.length === 500 && pageDocs.length > 0
      ? pageDocs[pageDocs.length - 1]?.id ?? null
      : null;

    return Response.json({ items, nextCursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load withdrawal requests.";
    const status = message.includes("admin") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
