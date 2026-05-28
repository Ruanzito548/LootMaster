import { FieldValue } from "firebase-admin/firestore";

import { clampPercent } from "@/lib/agency";
import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  agentUid?: string;
  feeSharePercent?: number;
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

  const agentUid = body.agentUid?.trim() ?? "";
  const feeSharePercent = clampPercent(Number(body.feeSharePercent));

  if (!agentUid) {
    return Response.json({ error: "agentUid is required." }, { status: 422 });
  }

  if (!Number.isFinite(Number(body.feeSharePercent))) {
    return Response.json({ error: "feeSharePercent must be a valid number." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const agentRef = adminDb.collection("users").doc(agentUid);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      return Response.json({ error: "Agent not found." }, { status: 404 });
    }

    const agentData = agentDoc.data() as Record<string, unknown>;
    if (agentData.isAgent !== true) {
      return Response.json({ error: "Selected user is not an agent." }, { status: 409 });
    }

    await agentRef.set(
      {
        agentFeeSharePercent: feeSharePercent,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return Response.json({ ok: true, feeSharePercent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update agent fee share.";
    return Response.json({ error: message }, { status: 500 });
  }
}
