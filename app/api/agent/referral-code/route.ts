import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { buildAgentReferralCode } from "@/lib/agency";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: Request): Promise<Response> {
  try {
    const decodedToken = await requireAuthenticatedUserRequest(request);
    const db = getAdminDb();
    const partnerRef = db.collection("users").doc(decodedToken.uid);
    const partnerSnapshot = await partnerRef.get();

    if (!partnerSnapshot.exists || partnerSnapshot.data()?.isAgent !== true) {
      return Response.json({ error: "Apenas parceiros podem gerar códigos." }, { status: 403 });
    }

    const currentCode = partnerSnapshot.data()?.agentReferralCode;
    if (typeof currentCode === "string" && currentCode.trim()) {
      return Response.json({ code: currentCode.trim().toUpperCase() });
    }

    const code = buildAgentReferralCode(decodedToken.uid);
    await partnerRef.set(
      {
        agentReferralCode: code,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return Response.json({ code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar o código do parceiro.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
