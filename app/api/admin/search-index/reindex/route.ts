import { FieldPath, FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import {
  ADMIN_SEARCH_INDEX_STATUS_DOC_ID,
  buildGiftcardClaimAdminSearchIndex,
  buildUserAdminSearchIndex,
} from "@/lib/admin-search";
import { getAdminDb } from "@/lib/firebase-admin";

type Scope = "users" | "giftcard-claims" | "all";

type Body = {
  scope?: Scope;
  usersCursor?: string;
  claimsCursor?: string;
  limit?: number;
};

function normalizeScope(value: unknown): Scope {
  if (value === "users" || value === "giftcard-claims") {
    return value;
  }

  return "all";
}

function normalizeLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 200;
  }

  return Math.max(25, Math.min(400, Math.floor(parsed)));
}

async function reindexUsers(cursor: string | null, limit: number) {
  const adminDb = getAdminDb();
  let query = adminDb.collection("users").orderBy(FieldPath.documentId()).limit(limit);

  if (cursor) {
    const cursorSnapshot = await adminDb.collection("users").doc(cursor).get();
    if (cursorSnapshot.exists) {
      query = query.startAfter(cursorSnapshot);
    }
  }

  const snapshot = await query.get();
  const batch = adminDb.batch();

  for (const docRow of snapshot.docs) {
    const data = docRow.data() as Record<string, unknown>;
    batch.set(
      docRow.ref,
      buildUserAdminSearchIndex({
        uid: docRow.id,
        username: typeof data.username === "string" ? data.username : null,
        email: typeof data.email === "string" ? data.email : null,
        agentReferralCode: typeof data.agentReferralCode === "string" ? data.agentReferralCode : null,
      }),
      { merge: true },
    );
  }

  if (!snapshot.empty) {
    await batch.commit();
  }

  return {
    updatedCount: snapshot.docs.length,
    nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null,
  };
}

async function reindexClaims(cursor: string | null, limit: number) {
  const adminDb = getAdminDb();
  let query = adminDb.collection("giftcard-claims").orderBy(FieldPath.documentId()).limit(limit);

  if (cursor) {
    const cursorSnapshot = await adminDb.collection("giftcard-claims").doc(cursor).get();
    if (cursorSnapshot.exists) {
      query = query.startAfter(cursorSnapshot);
    }
  }

  const snapshot = await query.get();
  const batch = adminDb.batch();

  for (const docRow of snapshot.docs) {
    const data = docRow.data() as Record<string, unknown>;
    batch.set(
      docRow.ref,
      buildGiftcardClaimAdminSearchIndex({
        claimId: docRow.id,
        uid: typeof data.uid === "string" ? data.uid : null,
        username: typeof data.username === "string" ? data.username : null,
        accountEmail: typeof data.accountEmail === "string" ? data.accountEmail : null,
        redeemEmail: typeof data.redeemEmail === "string" ? data.redeemEmail : null,
        giftCardTitle: typeof data.giftCardTitle === "string" ? data.giftCardTitle : null,
        country: typeof data.country === "string" ? data.country : null,
      }),
      { merge: true },
    );
  }

  if (!snapshot.empty) {
    await batch.commit();
  }

  return {
    updatedCount: snapshot.docs.length,
    nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null,
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: Body;

  try {
    await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as Body;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: status === 401 ? "Unauthorized request." : "Invalid request body." }, { status });
  }

  try {
    const adminDb = getAdminDb();
    const scope = normalizeScope(body.scope);
    const limit = normalizeLimit(body.limit);
    const result = {
      users: null as null | Awaited<ReturnType<typeof reindexUsers>>,
      claims: null as null | Awaited<ReturnType<typeof reindexClaims>>,
    };

    if (scope === "all" || scope === "users") {
      result.users = await reindexUsers(body.usersCursor?.trim() || null, limit);
      await adminDb.collection("app-config").doc(ADMIN_SEARCH_INDEX_STATUS_DOC_ID).set(
        {
          usersComplete: result.users.nextCursor === null,
          usersUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (scope === "all" || scope === "giftcard-claims") {
      result.claims = await reindexClaims(body.claimsCursor?.trim() || null, limit);
      await adminDb.collection("app-config").doc(ADMIN_SEARCH_INDEX_STATUS_DOC_ID).set(
        {
          claimsComplete: result.claims.nextCursor === null,
          claimsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return Response.json({ ok: true, scope, limit, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not rebuild admin search indexes.";
    return Response.json({ error: message }, { status: 500 });
  }
}