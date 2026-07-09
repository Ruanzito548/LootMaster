import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_FEE_SETTINGS_DOC_ID,
  buildDefaultSiteFeeSettings,
  sanitizeSiteFeeSettings,
} from "@/lib/site-fee-settings";

type PutBody = {
  globalPlatformFeePercent?: number;
  cardGatewayFeePercent?: number;
};

function statusFromErrorMessage(message: string): number {
  if (message.includes("authorization") || message.includes("token") || message.includes("admin")) {
    return 401;
  }

  if (message.includes("payload") || message.includes("fee") || message.includes("percent")) {
    return 422;
  }

  return 500;
}

function getAdminLabel(data: Record<string, unknown> | null, fallbackUid: string) {
  const label =
    typeof data?.displayName === "string"
      ? data.displayName
      : typeof data?.username === "string"
        ? data.username
        : typeof data?.name === "string"
          ? data.name
          : typeof data?.email === "string"
            ? data.email
            : fallbackUid;

  return label.trim() || fallbackUid;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedAdminRequest(request);

    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    const settings = snapshot.exists ? sanitizeSiteFeeSettings(snapshot.data()) : buildDefaultSiteFeeSettings();

    return Response.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load dashboard settings.";
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

  const hasGlobalPlatformFee = typeof body?.globalPlatformFeePercent === "number";
  const hasCardGatewayFee = typeof body?.cardGatewayFeePercent === "number";

  if (!body || (!hasGlobalPlatformFee && !hasCardGatewayFee)) {
    return Response.json(
      { error: "Invalid payload for dashboard settings fees." },
      { status: 422 },
    );
  }

  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("app-config").doc(SITE_FEE_SETTINGS_DOC_ID).get();
    const base = snapshot.exists ? sanitizeSiteFeeSettings(snapshot.data()) : buildDefaultSiteFeeSettings();
    const settings = sanitizeSiteFeeSettings({
      ...base,
      globalPlatformFeePercent: hasGlobalPlatformFee ? body.globalPlatformFeePercent : base.globalPlatformFeePercent,
      cardGatewayFeePercent: hasCardGatewayFee ? body.cardGatewayFeePercent : base.cardGatewayFeePercent,
      updatedAtMs: Date.now(),
    });

    const adminUserDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminUserData = adminUserDoc.exists ? (adminUserDoc.data() as Record<string, unknown>) : null;
    const adminLabel = getAdminLabel(adminUserData, decodedToken.uid);

    await adminDb
      .collection("app-config")
      .doc(SITE_FEE_SETTINGS_DOC_ID)
      .set(
        {
          ...settings,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid,
          updatedByLabel: adminLabel,
        },
        { merge: true },
      );

    return Response.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save dashboard settings.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
