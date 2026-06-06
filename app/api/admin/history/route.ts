import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { fetchGlobalActivityHistoryPage } from "@/lib/activity-history.server";
import type { ActivityHistoryLog } from "@/lib/activity-history-types";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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

function isFiveDigitShortId(value: string | null): value is string {
  return typeof value === "string" && /^\d{5}$/.test(value);
}

function asPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function toShortId(value: number): string {
  return String(value).padStart(5, "0");
}

function readDisplayName(source: Record<string, unknown>): string | null {
  const username = typeof source.username === "string" ? source.username.trim() : "";
  if (username) return username;

  const displayName = typeof source.displayName === "string" ? source.displayName.trim() : "";
  if (displayName) return displayName;

  const email = typeof source.email === "string" ? source.email.trim() : "";
  if (email) return email;

  return null;
}

async function resolveUserUidFromFilter(userFilter: string | null): Promise<string | null> {
  if (!userFilter) {
    return null;
  }

  if (!isFiveDigitShortId(userFilter)) {
    return userFilter;
  }

  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("users").where("userShortId", "==", userFilter).limit(1).get();
  if (snapshot.empty) {
    return "__no_user_match__";
  }

  return snapshot.docs[0]?.id ?? "__no_user_match__";
}

async function enrichWithUserIdentity(items: ActivityHistoryLog[]): Promise<ActivityHistoryLog[]> {
  if (items.length === 0) {
    return items;
  }

  const adminDb = getAdminDb();
  const uniqueUserUids = Array.from(new Set(items.map((item) => item.userUid).filter(Boolean)));
  if (uniqueUserUids.length === 0) {
    return items;
  }

  const userRefs = uniqueUserUids.map((uid) => adminDb.collection("users").doc(uid));
  const userSnapshots = await adminDb.getAll(...userRefs);

  const identityByUid = new Map<string, { name: string | null; shortId: string | null }>();
  const missingSequenceUids: string[] = [];

  for (const userSnapshot of userSnapshots) {
    if (!userSnapshot.exists) {
      identityByUid.set(userSnapshot.id, { name: null, shortId: null });
      continue;
    }

    const source = userSnapshot.data() as Record<string, unknown>;
    const name = readDisplayName(source);
    const numericSequence = asPositiveInteger(source.userSequenceNumber);
    const existingShortId = typeof source.userShortId === "string" && /^\d{5}$/.test(source.userShortId) ? source.userShortId : null;
    const shortId = existingShortId ?? (numericSequence ? toShortId(numericSequence) : null);

    identityByUid.set(userSnapshot.id, { name, shortId });

    if (!shortId) {
      missingSequenceUids.push(userSnapshot.id);
    }
  }

  if (missingSequenceUids.length > 0) {
    const countersRef = adminDb.collection("_system").doc("counters");
    const newlyAssigned = new Map<string, string>();

    await adminDb.runTransaction(async (tx) => {
      const countersSnapshot = await tx.get(countersRef);
      const counters = countersSnapshot.exists ? (countersSnapshot.data() as Record<string, unknown>) : null;
      let currentSequence = asPositiveInteger(counters?.userSequenceCurrent) ?? 0;
      let changed = false;

      for (const uid of missingSequenceUids) {
        const userRef = adminDb.collection("users").doc(uid);
        const userSnapshot = await tx.get(userRef);
        if (!userSnapshot.exists) {
          continue;
        }

        const source = userSnapshot.data() as Record<string, unknown>;
        const numericSequence = asPositiveInteger(source.userSequenceNumber);
        const existingShortId = typeof source.userShortId === "string" && /^\d{5}$/.test(source.userShortId) ? source.userShortId : null;

        if (existingShortId) {
          newlyAssigned.set(uid, existingShortId);
          continue;
        }

        if (numericSequence) {
          const normalized = toShortId(numericSequence);
          tx.set(
            userRef,
            {
              userShortId: normalized,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          newlyAssigned.set(uid, normalized);
          changed = true;
          continue;
        }

        currentSequence += 1;
        const createdShortId = toShortId(currentSequence);

        tx.set(
          userRef,
          {
            userSequenceNumber: currentSequence,
            userShortId: createdShortId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        newlyAssigned.set(uid, createdShortId);
        changed = true;
      }

      if (changed) {
        tx.set(
          countersRef,
          {
            userSequenceCurrent: currentSequence,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    });

    for (const uid of missingSequenceUids) {
      const current = identityByUid.get(uid) ?? { name: null, shortId: null };
      identityByUid.set(uid, {
        ...current,
        shortId: newlyAssigned.get(uid) ?? current.shortId,
      });
    }
  }

  return items.map((item) => {
    const identity = identityByUid.get(item.userUid);
    return {
      ...item,
      userDisplayName: identity?.name ?? item.userDisplayName ?? null,
      userShortId: identity?.shortId ?? item.userShortId ?? null,
    };
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);
    const url = new URL(request.url);
    const normalizedUserFilter = normalizeFilter(url.searchParams.get("userUid"));
    const resolvedUserUid = await resolveUserUidFromFilter(normalizedUserFilter);

    const page = await fetchGlobalActivityHistoryPage(getAdminDb(), {
      cursor: normalizeFilter(url.searchParams.get("cursor")),
      limit: parseLimit(url.searchParams.get("limit")),
      userUid: resolvedUserUid,
      category: normalizeFilter(url.searchParams.get("category")),
      actionType: normalizeFilter(url.searchParams.get("actionType")),
      status: normalizeFilter(url.searchParams.get("status")),
    });

    const enrichedItems = await enrichWithUserIdentity(page.items);

    return Response.json({
      ...page,
      items: enrichedItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin history.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
