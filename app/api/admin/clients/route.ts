import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import {
  ADMIN_SEARCH_INDEX_STATUS_DOC_ID,
  matchesAdminSearchText,
  normalizeAdminSearchValue,
} from "@/lib/admin-search";
import { getAdminDb } from "@/lib/firebase-admin";
import type { DocumentData, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";

import type { AgentRow, ClientRow } from "@/app/admin/clientes/clientes-types";

type ClientsMode = "all" | "agents";

type TimestampLike = {
  toDate?: () => Date;
};

function serializeDateLike(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

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

function normalizeMode(value: string | null): ClientsMode {
  if (value === "agents") {
    return "agents";
  }

  return "all";
}

function normalizeSearch(value: string | null): string {
  return normalizeAdminSearchValue(value);
}

function toSortableTimestamp(value: unknown): number {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

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
    lootCoins: typeof data.lootCoins === "number" && Number.isFinite(data.lootCoins) ? data.lootCoins : 0,
    createdAt: serializeDateLike(data.createdAt),
    lastActivityAt:
      serializeDateLike(data.lastAccessAt) ??
      serializeDateLike(data.lastProgressAt) ??
      serializeDateLike(data.updatedAt),
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
    lootCoins: typeof data.lootCoins === "number" && Number.isFinite(data.lootCoins) ? data.lootCoins : 0,
    createdAt: serializeDateLike(data.createdAt),
    lastActivityAt:
      serializeDateLike(data.lastAccessAt) ??
      serializeDateLike(data.lastProgressAt) ??
      serializeDateLike(data.updatedAt),
    agentFeeSharePercent:
      typeof data.agentFeeSharePercent === "number" && Number.isFinite(data.agentFeeSharePercent)
        ? data.agentFeeSharePercent
        : 50,
    agentReferralCode: typeof data.agentReferralCode === "string" ? data.agentReferralCode : "",
  };
}

async function loadIndexedUserDocs(input: {
  adminDb: ReturnType<typeof getAdminDb>;
  mode: ClientsMode;
  cursor: string | null;
  limit: number;
  search: string;
}) {
  const batchSize = Math.max(input.limit, 50);
  let query: Query<DocumentData> = input.adminDb
    .collection("users")
    .where("adminSearchPrefixes", "array-contains", input.search)
    .limit(batchSize);

  const collected: QueryDocumentSnapshot<DocumentData>[] = [];

  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    collected.push(
      ...snapshot.docs.filter((docRow) => {
        if (input.mode === "all") {
          return true;
        }

        const data = docRow.data() as Record<string, unknown>;
        return data.isAgent === true;
      }),
    );

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (snapshot.docs.length < batchSize || !lastDoc) {
      break;
    }

    query = input.adminDb
      .collection("users")
      .where("adminSearchPrefixes", "array-contains", input.search)
      .startAfter(lastDoc)
      .limit(batchSize);
  }

  const sortedDocs = [...collected].sort((left, right) => {
    const leftData = left.data() as Record<string, unknown>;
    const rightData = right.data() as Record<string, unknown>;
    const leftTs = toSortableTimestamp(leftData.updatedAt) || toSortableTimestamp(leftData.createdAt);
    const rightTs = toSortableTimestamp(rightData.updatedAt) || toSortableTimestamp(rightData.createdAt);
    return rightTs - leftTs;
  });

  const startIndex = input.cursor
    ? Math.max(
        0,
        sortedDocs.findIndex((docRow) => docRow.id === input.cursor) + 1,
      )
    : 0;
  const pageDocs = sortedDocs.slice(startIndex, startIndex + input.limit);
  const nextCursor = startIndex + input.limit < sortedDocs.length ? pageDocs[pageDocs.length - 1]?.id ?? null : null;

  return {
    docs: pageDocs,
    nextCursor,
  };
}

async function isUsersIndexComplete(adminDb: ReturnType<typeof getAdminDb>) {
  const snapshot = await adminDb.collection("app-config").doc(ADMIN_SEARCH_INDEX_STATUS_DOC_ID).get();
  if (!snapshot.exists) {
    return false;
  }

  const data = snapshot.data() as Record<string, unknown>;
  return data.usersComplete === true;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const url = new URL(request.url);
    const mode = normalizeMode(url.searchParams.get("mode"));
    const cursor = url.searchParams.get("cursor")?.trim() || null;
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const search = normalizeSearch(url.searchParams.get("q"));
    const assignedAgentId = url.searchParams.get("assignedAgentId")?.trim() || null;
    const adminDb = getAdminDb();

    if (search && !assignedAgentId && (await isUsersIndexComplete(adminDb))) {
      const indexedResult = await loadIndexedUserDocs({
        adminDb,
        mode,
        cursor,
        limit,
        search,
      });

      if (indexedResult.docs.length > 0) {
        if (mode === "agents") {
          const items = indexedResult.docs.map((docRow) => mapAgentRow(docRow.id, docRow.data() as Record<string, unknown>));
          return Response.json({ items, nextCursor: indexedResult.nextCursor });
        }

        const items = indexedResult.docs.map((docRow) => mapClientRow(docRow.id, docRow.data() as Record<string, unknown>));
        return Response.json({ items, nextCursor: indexedResult.nextCursor });
      }
    }

    let query: Query<DocumentData> = adminDb.collection("users");
    if (mode === "agents") {
      query = query.where("isAgent", "==", true);
    }

    const snapshot = await query.get();

    const matchingDocs = snapshot.docs.filter((docRow) => {
      if (!search) {
        const data = docRow.data() as Record<string, unknown>;
        return !assignedAgentId || data.assignedAgentId === assignedAgentId;
      }

      const data = docRow.data() as Record<string, unknown>;
      if (assignedAgentId && data.assignedAgentId !== assignedAgentId) {
        return false;
      }
      return matchesAdminSearchText(
        [
          docRow.id,
          typeof data.username === "string" ? data.username : "",
          typeof data.email === "string" ? data.email : "",
          typeof data.agentReferralCode === "string" ? data.agentReferralCode : "",
        ],
        search,
      );
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
