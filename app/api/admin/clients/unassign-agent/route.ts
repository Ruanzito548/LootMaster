import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  clientUid?: string;
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

  if (!clientUid) {
    return Response.json({ error: "clientUid is required." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const clientRef = adminDb.collection("users").doc(clientUid);

    await adminDb.runTransaction(async (tx) => {
      const clientDoc = await tx.get(clientRef);
      if (!clientDoc.exists) {
        throw new Error("Client not found.");
      }

      const clientData = clientDoc.data() as Record<string, unknown>;
      const previousAgentUid = typeof clientData.assignedAgentId === "string" ? clientData.assignedAgentId : null;

      tx.set(
        clientRef,
        {
          assignedAgentId: null,
          unassignedAgentAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      writeActivityLog(tx, adminDb, {
        userUid: clientUid,
        actorUid: adminToken.uid,
        actorRole: "admin",
        actionType: "admin_client_agent_unassigned",
        category: "admin",
        description: "Admin removed the assigned agent from a client.",
        relatedUserUid: previousAgentUid,
        origin: "admin:clients:unassign-agent",
        status: "admin_action",
        tags: ["admin", "clients", "agents", "unassignment"],
        metadata: {
          clientUid,
          previousAgentUid,
        },
        mirrorToAdminAudit: true,
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not unassign agent.";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
