import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  GAME_CONFIGURATION_COLLECTION,
  GAME_CONFIGURATION_DOC_ID,
  buildDefaultGameConfiguration,
  sanitizeGameConfiguration,
} from "@/lib/game-configuration";

type PutBody = {
  config?: unknown;
};

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token") || message.includes("admin")) {
    return 401;
  }

  if (message.includes("payload") || message.includes("config")) {
    return 422;
  }

  return 500;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection(GAME_CONFIGURATION_COLLECTION).doc(GAME_CONFIGURATION_DOC_ID).get();

    const config = snapshot.exists ? sanitizeGameConfiguration(snapshot.data()) : buildDefaultGameConfiguration();

    return Response.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load game configuration.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}

export async function PUT(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedAdminRequest>>;
  let body: PutBody;

  try {
    decodedToken = await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as PutBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }

  if (!body || typeof body !== "object" || body.config === undefined) {
    return Response.json({ error: "Invalid payload config." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const sanitized = sanitizeGameConfiguration(body.config);

    await adminDb
      .collection(GAME_CONFIGURATION_COLLECTION)
      .doc(GAME_CONFIGURATION_DOC_ID)
      .set(
        {
          ...sanitized,
          updatedAtMs: Date.now(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid,
        },
        { merge: true },
      );

    return Response.json({ ok: true, config: sanitized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save game configuration.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
