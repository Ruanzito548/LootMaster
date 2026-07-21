import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import type { DocumentData, Query } from "firebase-admin/firestore";

import type { AgentRow, ClientRow } from "@/app/admin/clientes/clientes-types";

type ClientsMode = "all" | "agents";

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

function normalizeMode(value: string | null): ClientsMode {
  if (value === "agents") {
    return "agents";
  }

  return "all";
}

function normalizeSearch(value: string | null): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function toSortableTimestamp(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const parsed = value as TimestampLike;
  if (typeof parsed.toDate !== "function") {
    return 0;
  }

  const date = parsed.toDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function mapClientRow(uid: string, data: Record<string, unknown>): ClientRow {
  return {
    uid,
    username: typeof data.username === "string" ? data.username : "--",
    email: typeof data.email === "string" ? data.email : "--",
    assignedAgentId:
      typeof data.assignedAgentId === "string" && data.assignedAgentId.trim() ? data.assignedAgentId : null,
    isAgent: data.isAgent === true,
    agentFeeSharePercent:
      typeof data.agentFeeSharePercent === "number" && Number.isFinite(data.agentFeeSharePercent)
        ? data.agentFeeSharePercent
        : 50,
    agentReferralCode: typeof data.agentReferralCode === "string" ? data.agentReferralCode : "",
  };
}

function mapAgentRow(uid: string, data: Record<string, unknown>): AgentRow {
  return {
    uid,
    username: typeof data.username === "string" ? data.username : "--",
    email: typeof data.email === "string" ? data.email : "--",
    agentFeeSharePercent:
      typeof data.agentFeeSharePercent === "number" && Number.isFinite(data.agentFeeSharePercent)
        ? data.agentFeeSharePercent
        : 50,
    agentReferralCode: typeof data.agentReferralCode === "string" ? data.agentReferralCode : "",
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

    let query: Query<DocumentData> = adminDb.collection("users");
    if (mode === "agents") {
      query = query.where("isAgent", "==", true);
    }

    const snapshot = await query.get();

    const matchingDocs = snapshot.docs.filter((docRow) => {
      if (!search) {
        return true;
      }

      const data = docRow.data() as Record<string, unknown>;
      const username = typeof data.username === "string" ? data.username.toLocaleLowerCase() : "";
      const email = typeof data.email === "string" ? data.email.toLocaleLowerCase() : "";
      return username.includes(search) || email.includes(search);
    });

    const sortedDocs = [...matchingDocs].sort((left, right) => {
      const leftData = left.data() as Record<string, unknown>;
      const rightData = right.data() as Record<string, unknown>;
      const leftTs = toSortableTimestamp(leftData.updatedAt) || toSortableTimestamp(leftData.createdAt);
      const rightTs = toSortableTimestamp(rightData.updatedAt) || toSortableTimestamp(rightData.createdAt);
      return rightTs - leftTs;
    });

    const startIndex = cursor
      ? Math.max(
          0,
          sortedDocs.findIndex((docRow) => docRow.id === cursor) + 1,
        )
      : 0;

    const pageDocs = sortedDocs.slice(startIndex, startIndex + limit);

    if (mode === "agents") {
      const items = pageDocs.map((docRow) => mapAgentRow(docRow.id, docRow.data() as Record<string, unknown>));
      const nextCursor = startIndex + limit < sortedDocs.length ? pageDocs[pageDocs.length - 1]?.id ?? null : null;
      return Response.json({ items, nextCursor });
    }

    const items = pageDocs.map((docRow) => mapClientRow(docRow.id, docRow.data() as Record<string, unknown>));
    const nextCursor = startIndex + limit < sortedDocs.length ? pageDocs[pageDocs.length - 1]?.id ?? null : null;
    return Response.json({ items, nextCursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load clients.";
    const status = message.includes("admin") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
