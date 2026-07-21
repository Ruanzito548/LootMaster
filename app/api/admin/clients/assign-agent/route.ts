import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  clientUid?: string;
  agentUid?: string;
};

export async function POST(request: Request): Promise<Response> {
  let adminToken: Awaited<ReturnType<typeof requireAuthenticatedAdminRequest>>;
  let body: RequestBody;

  try {
    adminToken = await requireAuthenticatedAdminRequest(request);
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
  const agentUid = body.agentUid?.trim() ?? "";

  if (!clientUid || !agentUid) {
    return Response.json({ error: "clientUid and agentUid are required." }, { status: 422 });
  }

  if (clientUid === agentUid) {
    return Response.json({ error: "A client cannot be assigned to itself." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const [clientDoc, agentDoc] = await Promise.all([
      adminDb.collection("users").doc(clientUid).get(),
      adminDb.collection("users").doc(agentUid).get(),
    ]);

    if (!clientDoc.exists) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }

    if (!agentDoc.exists) {
      return Response.json({ error: "Agent not found." }, { status: 404 });
    }

    const agentData = agentDoc.data() as Record<string, unknown>;
    if (agentData.isAgent !== true) {
      return Response.json({ error: "Selected user is not an agent." }, { status: 409 });
    }

    await adminDb.runTransaction(async (tx) => {
      tx.set(
        adminDb.collection("users").doc(clientUid),
        {
          assignedAgentId: agentUid,
          assignedAgentAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      writeActivityLog(tx, adminDb, {
        userUid: clientUid,
        actorUid: adminToken.uid,
        actorRole: "admin",
        actionType: "admin_client_agent_assigned",
        category: "admin",
        description: "Admin assigned an agent to a client.",
        relatedUserUid: agentUid,
        relatedUserName: typeof agentData.username === "string" ? agentData.username : null,
        origin: "admin:clients:assign-agent",
        status: "admin_action",
        tags: ["admin", "clients", "agents", "assignment"],
        metadata: {
          clientUid,
          agentUid,
        },
        mirrorToAdminAudit: true,
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign agent.";
    return Response.json({ error: message }, { status: 500 });
  }
}
