import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { fetchActivityHistoryPage } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.max(1, Math.min(40, Math.floor(parsed)));
}

export async function GET(request: Request): Promise<Response> {
  try {
    const decodedToken = await requireAuthenticatedUserRequest(request);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = parseLimit(url.searchParams.get("limit"));

    const page = await fetchActivityHistoryPage(getAdminDb(), decodedToken.uid, {
      cursor,
      limit,
    });

    return Response.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load activity history.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
