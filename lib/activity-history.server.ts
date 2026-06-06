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

  return {
    id,
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

  return {
    id: typeof data.id === "string" ? data.id : snapshot.id,
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
      data.status === "system"
        ? data.status
        : "completed",
    createdAtMs: typeof data.createdAtMs === "number" && Number.isFinite(data.createdAtMs) ? data.createdAtMs : 0,
    createdAt: serializeTimestamp(data.createdAt),
    sortKey: typeof data.sortKey === "string" ? data.sortKey : toSortKey(0, snapshot.id),
    tags: Array.isArray(data.tags) ? data.tags.filter((value): value is string => typeof value === "string") : [],
    metadata: mapStoredMetadata(data.metadata),
  };
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
