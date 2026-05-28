import { FieldValue } from "firebase-admin/firestore";

import { buildAgentReferralCode, DEFAULT_AGENT_FEE_SHARE_PERCENT } from "@/lib/agency";
import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  clientUid?: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as RequestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json(
      { error: status === 401 ? "Unauthorized request." : "Invalid request body." },
      { status },
    );
  }

  const clientUid = body.clientUid?.trim() ?? "";

  if (!clientUid) {
    return Response.json({ error: "clientUid is required." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(clientUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const currentShare =
      typeof userData.agentFeeSharePercent === "number" && Number.isFinite(userData.agentFeeSharePercent)
        ? userData.agentFeeSharePercent
        : DEFAULT_AGENT_FEE_SHARE_PERCENT;
    const referralCode =
      typeof userData.agentReferralCode === "string" && userData.agentReferralCode.trim()
        ? userData.agentReferralCode.trim().toUpperCase()
        : buildAgentReferralCode(clientUid);

    await userRef.set(
      {
        isAgent: true,
        agentFeeSharePercent: currentShare,
        agentReferralCode: referralCode,
        promotedToAgentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return Response.json({ ok: true, referralCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not promote user to agent.";
    return Response.json({ error: message }, { status: 500 });
  }
}
