import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";

type Body = {
  claimId?: string;
};

export async function POST(request: Request): Promise<Response> {
  let adminToken: Awaited<ReturnType<typeof requireAuthenticatedAdminRequest>>;
  let body: Body;

  try {
    adminToken = await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as Body;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: status === 401 ? "Unauthorized request." : "Invalid request body." }, { status });
  }

  const claimId = (body.claimId ?? "").trim();
  if (!claimId) {
    return Response.json({ error: "Missing claim id." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const claimRef = adminDb.collection("giftcard-claims").doc(claimId);

    const result = await adminDb.runTransaction(async (tx) => {
      const claimSnapshot = await tx.get(claimRef);
      if (!claimSnapshot.exists) {
        throw new Error("Gift card claim not found.");
      }

      const claimData = claimSnapshot.data() as Record<string, unknown>;
      const status = typeof claimData.status === "string" ? claimData.status : "open";

      if (status === "completed") {
        return {
          alreadyCompleted: true,
          status,
        };
      }

      const uid = typeof claimData.uid === "string" ? claimData.uid : "";
      const giftCardTitle = typeof claimData.giftCardTitle === "string" ? claimData.giftCardTitle : "Gift Card";

      tx.set(
        claimRef,
        {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          completedByUid: adminToken.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (uid) {
        writeActivityLog(tx, adminDb, {
          userUid: uid,
          actorUid: adminToken.uid,
          actorRole: "admin",
          actionType: "giftcard_redeem_completed",
          category: "admin",
          description: `Admin marked gift card claim ${giftCardTitle} as sent.`,
          origin: "admin:giftcard-claims",
          status: "completed",
          tags: ["admin", "giftcard", "claim", "completed"],
          metadata: {
            claimId,
            giftCardTitle,
          },
          mirrorToAdminAudit: true,
        });
      }

      return {
        alreadyCompleted: false,
        status: "completed",
      };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete gift card claim.";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
