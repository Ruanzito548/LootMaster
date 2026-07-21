import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { buildDefaultChestSystemConfig, sanitizeChestSystemConfig } from "@/lib/chest-config";
import { getAdminDb } from "@/lib/firebase-admin";

type PutBody = {
  config?: unknown;
};

function summarizeChestConfig(config: ReturnType<typeof sanitizeChestSystemConfig>) {
  const profiles = Object.values(config.byChest);
  const accountDropsEnabled = profiles.filter((profile) => profile.accountDrop.enabled).length;
  const totalFragmentChance = profiles.reduce((sum, profile) => sum + profile.giftCardFragment.chancePercent, 0);
  const totalFullGiftChance = profiles.reduce((sum, profile) => sum + profile.fullGiftCard.chancePercent, 0);

  return {
    accountDropsEnabled,
    totalFragmentChance,
    totalFullGiftChance,
  };
}

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
    const snapshot = await adminDb.collection("app-config").doc("chest-system").get();

    const config = snapshot.exists ? sanitizeChestSystemConfig(snapshot.data()) : buildDefaultChestSystemConfig();

    return Response.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin chest config.";
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
    const currentSnapshot = await adminDb.collection("app-config").doc("chest-system").get();
    const currentConfig = currentSnapshot.exists
      ? sanitizeChestSystemConfig(currentSnapshot.data())
      : buildDefaultChestSystemConfig();
    const sanitized = sanitizeChestSystemConfig(body.config);

    await adminDb.runTransaction(async (tx) => {
      tx.set(
        adminDb.collection("app-config").doc("chest-system"),
        {
          ...sanitized,
          updatedAtMs: Date.now(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: decodedToken.uid,
        },
        { merge: true },
      );

      const previousSummary = summarizeChestConfig(currentConfig);
      const nextSummary = summarizeChestConfig(sanitized);

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "admin",
        actionType: "admin_chest_configuration_updated",
        category: "admin",
        description: "Admin updated chest rewards configuration.",
        origin: "admin.chests-config.put",
        status: "admin_action",
        tags: ["admin", "chests", "settings"],
        metadata: {
          previousAccountDropsEnabled: previousSummary.accountDropsEnabled,
          nextAccountDropsEnabled: nextSummary.accountDropsEnabled,
          previousTotalFragmentChance: previousSummary.totalFragmentChance,
          nextTotalFragmentChance: nextSummary.totalFragmentChance,
          previousTotalFullGiftChance: previousSummary.totalFullGiftChance,
          nextTotalFullGiftChance: nextSummary.totalFullGiftChance,
        },
        mirrorToAdminAudit: true,
      });
    });

    return Response.json({ ok: true, config: sanitized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save chest config.";
    return Response.json({ error: message }, { status: statusFromErrorMessage(message) });
  }
}
