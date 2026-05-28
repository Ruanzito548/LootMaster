import { FieldValue } from "firebase-admin/firestore";

import { normalizeAgentCode } from "@/lib/agency";
import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  referralCode?: string;
};

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;
  let body: RequestBody;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
    body = (await request.json()) as RequestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json(
      { error: status === 401 ? "Unauthorized request." : "Invalid request body." },
      { status },
    );
  }

  const referralCode = normalizeAgentCode(body.referralCode);

  if (!referralCode) {
    return Response.json({ error: "Referral code is required." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return Response.json({ error: "User profile not found." }, { status: 404 });
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const assignedAgentId =
      typeof userData.assignedAgentId === "string" && userData.assignedAgentId.trim()
        ? userData.assignedAgentId.trim()
        : "";

    if (assignedAgentId) {
      return Response.json({ ok: true, alreadyAssigned: true });
    }

    let agentUid = "";

    if (referralCode === normalizeAgentCode(decodedToken.uid)) {
      return Response.json({ error: "You cannot use your own referral code." }, { status: 422 });
    }

    const directAgentDoc = await adminDb.collection("users").doc(referralCode).get();
    if (directAgentDoc.exists) {
      const directData = directAgentDoc.data() as Record<string, unknown>;
      if (directData.isAgent === true) {
        agentUid = directAgentDoc.id;
      }
    }

    if (!agentUid) {
      const agentSnapshot = await adminDb
        .collection("users")
        .where("agentReferralCode", "==", referralCode)
        .where("isAgent", "==", true)
        .limit(1)
        .get();

      if (!agentSnapshot.empty) {
        agentUid = agentSnapshot.docs[0].id;
      }
    }

    if (!agentUid) {
      return Response.json({ error: "Referral code not found." }, { status: 404 });
    }

    if (agentUid === decodedToken.uid) {
      return Response.json({ error: "You cannot use your own referral code." }, { status: 422 });
    }

    await userRef.set(
      {
        assignedAgentId: agentUid,
        assignedAgentAt: FieldValue.serverTimestamp(),
        assignedByReferralCode: referralCode,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return Response.json({ ok: true, agentUid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply referral code.";
    return Response.json({ error: message }, { status: 500 });
  }
}
