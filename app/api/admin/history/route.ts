import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { fetchGlobalActivityHistoryPage } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.max(1, Math.min(60, Math.floor(parsed)));
}

function normalizeFilter(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);
    const url = new URL(request.url);

    const page = await fetchGlobalActivityHistoryPage(getAdminDb(), {
      cursor: normalizeFilter(url.searchParams.get("cursor")),
      limit: parseLimit(url.searchParams.get("limit")),
      userUid: normalizeFilter(url.searchParams.get("userUid")),
      category: normalizeFilter(url.searchParams.get("category")),
      actionType: normalizeFilter(url.searchParams.get("actionType")),
      status: normalizeFilter(url.searchParams.get("status")),
    });

    return Response.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin history.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
