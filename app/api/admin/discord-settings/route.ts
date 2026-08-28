import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import {
  DISCORD_SETTINGS_DOC_ID,
  buildDefaultDiscordSettings,
  sanitizeDiscordSettings,
} from "@/lib/discord-settings";
import { getAdminDb } from "@/lib/firebase-admin";

type PutBody = {
  autoSendEnabled?: unknown;
  channelsByGame?: unknown;
  paymentMethods?: unknown;
};

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token") || message.includes("admin")) {
    return 401;
  }

  return 500;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("app-config").doc(DISCORD_SETTINGS_DOC_ID).get();
    const settings = snapshot.exists ? sanitizeDiscordSettings(snapshot.data()) : buildDefaultDiscordSettings();

    return Response.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Discord settings.";
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

  if (body.autoSendEnabled === undefined && body.channelsByGame === undefined && body.paymentMethods === undefined) {
    return Response.json({ error: "Invalid payload: nothing to update." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const currentSnapshot = await adminDb.collection("app-config").doc(DISCORD_SETTINGS_DOC_ID).get();
    const current = currentSnapshot.exists ? sanitizeDiscordSettings(currentSnapshot.data()) : buildDefaultDiscordSettings();

    const sanitized = sanitizeDiscordSettings({
      autoSendEnabled: body.autoSendEnabled === undefined ? current.autoSendEnabled : body.autoSendEnabled,
      channelsByGame: body.channelsByGame === undefined ? current.channelsByGame : body.channelsByGame,
      paymentMethods: body.paymentMethods === undefined ? current.paymentMethods : body.paymentMethods,
      updatedAtMs: Date.now(),
    });

    await adminDb.collection("app-config").doc(DISCORD_SETTINGS_DOC_ID).set(
      {
        ...sanitized,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: decodedToken.uid,
      },
      { merge: true },
    );

    return Response.json({ ok: true, settings: sanitized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save Discord settings.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
