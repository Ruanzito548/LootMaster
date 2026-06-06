import "server-only";

import { FieldValue, type DocumentData, type Firestore, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import type { ActivityHistoryLog, ActivityHistoryLogInput, ActivityHistoryPage } from "./activity-history-types";

type TimestampLike = {
  toDate?: () => Date;
};

function normalizeFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

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

function toSortKey(createdAtMs: number, id: string): string {
  return `${String(createdAtMs).padStart(13, "0")}_${id}`;
}

function toReferencePrefix(input: Pick<ActivityHistoryLogInput, "category" | "actionType">): string {
  if (input.actionType.includes("marketplace") || input.category === "marketplace") {
    return "MKT";
  }

  if (input.actionType.includes("craft") || input.category === "crafting") {
    return "CRAFT";
  }

  if (input.actionType.includes("chest") || input.category === "chests") {
    return "CHEST";
  }

  if (input.actionType.includes("admin") || input.category === "admin") {
    return "ADM";
  }

  if (input.actionType.includes("level") || input.actionType.includes("xp") || input.category === "progression") {
    return "PRG";
  }

  return "TX";
}

function toReference(input: Pick<ActivityHistoryLogInput, "category" | "actionType">, createdAtMs: number, id: string): string {
  const prefix = toReferencePrefix(input);
  const numeric = String(createdAtMs).slice(-7);
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  return `${prefix}-${numeric}${suffix}`;
}

function sanitizeStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 16);
}

function sanitizeMetadata(metadata: ActivityHistoryLogInput["metadata"]): Record<string, string | number | boolean | null> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => {
      return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  );
}

function mapStoredMetadata(metadata: unknown): Record<string, string | number | boolean | null> {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).filter(([, value]) => {
      return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  ) as Record<string, string | number | boolean | null>;
}

function buildPayload(id: string, input: ActivityHistoryLogInput) {
  const createdAtMs = Date.now();
  const reference = toReference(input, createdAtMs, id);

  return {
    id,
    reference,
    userUid: input.userUid,
    actorUid: input.actorUid ?? null,
    actorRole: input.actorRole ?? "user",
    actionType: input.actionType,
    category: input.category,
    description: input.description.trim(),
    itemId: input.itemId ?? null,
    itemName: input.itemName ?? null,
    itemCategory: input.itemCategory ?? null,
    quantity: normalizeFiniteNumber(input.quantity),
    value: normalizeFiniteNumber(input.value),
    valueUnit: input.valueUnit ?? null,
    relatedUserUid: input.relatedUserUid ?? null,
    relatedUserName: input.relatedUserName ?? null,
    rarity: input.rarity ?? null,
    origin: input.origin.trim(),
    status: input.status,
    createdAtMs,
    createdAt: FieldValue.serverTimestamp(),
    sortKey: toSortKey(createdAtMs, id),
    tags: sanitizeStringArray(input.tags),
    metadata: sanitizeMetadata(input.metadata),
  };
}

export function writeActivityLog(tx: Transaction, adminDb: Firestore, input: ActivityHistoryLogInput) {
  const userRef = adminDb.collection("users").doc(input.userUid);
  const userLogRef = userRef.collection("activity-logs").doc();
  const payload = buildPayload(userLogRef.id, input);

  tx.set(userLogRef, payload, { merge: false });

  if (input.mirrorToAdminAudit || input.actorRole === "admin" || input.actorRole === "system" || input.category === "admin") {
    const auditRef = adminDb.collection("admin-activity-logs").doc(userLogRef.id);
    tx.set(
      auditRef,
      {
        ...payload,
        targetUserUid: input.userUid,
        mirroredAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    );
  }

  return payload;
}

export function mapActivityHistoryLog(snapshot: QueryDocumentSnapshot<DocumentData>): ActivityHistoryLog {
  const data = snapshot.data() as Record<string, unknown>;
  const inferredReference = toReference(
    {
      category:
        data.category === "economy" ||
        data.category === "marketplace" ||
        data.category === "inventory" ||
        data.category === "chests" ||
        data.category === "crafting" ||
        data.category === "admin" ||
        data.category === "progression"
          ? data.category
          : "economy",
      actionType: typeof data.actionType === "string" ? data.actionType : "unknown",
    },
    typeof data.createdAtMs === "number" && Number.isFinite(data.createdAtMs) ? data.createdAtMs : 0,
    snapshot.id,
  );

  return {
    id: typeof data.id === "string" ? data.id : snapshot.id,
    reference: typeof data.reference === "string" ? data.reference : inferredReference,
    userUid: typeof data.userUid === "string" ? data.userUid : "",
    actorUid: typeof data.actorUid === "string" ? data.actorUid : null,
    actorRole: data.actorRole === "admin" || data.actorRole === "system" ? data.actorRole : "user",
    actionType: typeof data.actionType === "string" ? data.actionType : "unknown",
    category:
      data.category === "economy" ||
      data.category === "marketplace" ||
      data.category === "inventory" ||
      data.category === "chests" ||
      data.category === "crafting" ||
      data.category === "admin" ||
      data.category === "progression"
        ? data.category
        : "economy",
    description: typeof data.description === "string" ? data.description : "Activity recorded",
    itemId: typeof data.itemId === "string" ? data.itemId : null,
    itemName: typeof data.itemName === "string" ? data.itemName : null,
    itemCategory: typeof data.itemCategory === "string" ? data.itemCategory : null,
    quantity: typeof data.quantity === "number" && Number.isFinite(data.quantity) ? data.quantity : null,
    value: typeof data.value === "number" && Number.isFinite(data.value) ? data.value : null,
    valueUnit:
      data.valueUnit === "loot" || data.valueUnit === "usd" || data.valueUnit === "brl" || data.valueUnit === "xp" || data.valueUnit === "item"
        ? data.valueUnit
        : null,
    relatedUserUid: typeof data.relatedUserUid === "string" ? data.relatedUserUid : null,
    relatedUserName: typeof data.relatedUserName === "string" ? data.relatedUserName : null,
    rarity: typeof data.rarity === "string" ? data.rarity : null,
    origin: typeof data.origin === "string" ? data.origin : "unknown",
    status:
      data.status === "pending" ||
      data.status === "failed" ||
      data.status === "cancelled" ||
      data.status === "rejected" ||
      data.status === "approved" ||
      data.status === "system" ||
      data.status === "consumed" ||
      data.status === "admin_action"
        ? data.status
        : "completed",
    createdAtMs: typeof data.createdAtMs === "number" && Number.isFinite(data.createdAtMs) ? data.createdAtMs : 0,
    createdAt: serializeTimestamp(data.createdAt),
    sortKey: typeof data.sortKey === "string" ? data.sortKey : toSortKey(0, snapshot.id),
    tags: Array.isArray(data.tags) ? data.tags.filter((value): value is string => typeof value === "string") : [],
    metadata: mapStoredMetadata(data.metadata),
  };
}

type ActivityHistoryQueryInput = {
  cursor?: string | null;
  limit?: number;
  userUid?: string | null;
  category?: string | null;
  actionType?: string | null;
  status?: string | null;
};

function isMissingCollectionGroupIndexError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed_precondition") ||
    message.includes("requires an index") ||
    message.includes("collection_group_desc")
  );
}

function applyGlobalHistoryFilters(items: ActivityHistoryLog[], input: ActivityHistoryQueryInput): ActivityHistoryLog[] {
  let filtered = items;

  if (input.userUid) {
    filtered = filtered.filter((item) => item.userUid === input.userUid);
  }

  if (input.category) {
    filtered = filtered.filter((item) => item.category === input.category);
  }

  if (input.actionType) {
    filtered = filtered.filter((item) => item.actionType === input.actionType);
  }

  if (input.status) {
    filtered = filtered.filter((item) => item.status === input.status);
  }

  if (input.cursor) {
    filtered = filtered.filter((item) => item.sortKey < input.cursor!);
  }

  return filtered;
}

export async function fetchGlobalActivityHistoryPage(
  adminDb: Firestore,
  input: ActivityHistoryQueryInput = {},
): Promise<ActivityHistoryPage> {
  const safeLimit = Math.max(1, Math.min(60, Math.floor(input.limit ?? 30)));
  try {
    let query: FirebaseFirestore.Query<DocumentData> = adminDb.collectionGroup("activity-logs").orderBy("sortKey", "desc");

    if (input.userUid) {
      query = query.where("userUid", "==", input.userUid);
    }

    if (input.category) {
      query = query.where("category", "==", input.category);
    }

    if (input.actionType) {
      query = query.where("actionType", "==", input.actionType);
    }

    if (input.status) {
      query = query.where("status", "==", input.status);
    }

    query = query.limit(safeLimit);

    if (input.cursor) {
      query = query.startAfter(input.cursor);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(mapActivityHistoryLog);
    const nextCursor = snapshot.docs.length === safeLimit ? items[items.length - 1]?.sortKey ?? null : null;

    return {
      items,
      nextCursor,
    };
  } catch (error) {
    if (!isMissingCollectionGroupIndexError(error)) {
      throw error;
    }

    // Fallback path for projects that do not have collection-group descending indexes configured.
    // We read a broader window and apply filters/sorting in memory to keep admin/history available.
    const fallbackSnapshot = await adminDb.collectionGroup("activity-logs").limit(600).get();
    const fallbackItems = fallbackSnapshot.docs.map(mapActivityHistoryLog);

    const filtered = applyGlobalHistoryFilters(fallbackItems, input)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .slice(0, safeLimit);

    const nextCursor = filtered.length === safeLimit ? filtered[filtered.length - 1]?.sortKey ?? null : null;

    return {
      items: filtered,
      nextCursor,
    };
  }
}

export async function fetchActivityHistoryPage(
  adminDb: Firestore,
  userUid: string,
  input: {
    cursor?: string | null;
    limit?: number;
  } = {},
): Promise<ActivityHistoryPage> {
  const safeLimit = Math.max(1, Math.min(40, Math.floor(input.limit ?? 20)));
  let query = adminDb
    .collection("users")
    .doc(userUid)
    .collection("activity-logs")
    .orderBy("sortKey", "desc")
    .limit(safeLimit);

  if (input.cursor) {
    query = query.startAfter(input.cursor);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(mapActivityHistoryLog);
  const nextCursor = snapshot.docs.length === safeLimit ? items[items.length - 1]?.sortKey ?? null : null;

  return {
    items,
    nextCursor,
  };
}
