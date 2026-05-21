import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { deleteSupplierChannel } from "@/lib/discord-bot";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  orderId: string;
  threadId: string;
  closedByUid?: string;
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

  if (!body.orderId || !body.threadId) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const dispatchRef = adminDb.collection("order-dispatches").doc(body.orderId);
    const dispatchSnapshot = await dispatchRef.get();

    if (!dispatchSnapshot.exists) {
      return Response.json({ error: "Order dispatch not found." }, { status: 404 });
    }

    const dispatchData = dispatchSnapshot.data() as Record<string, unknown>;
    const currentStatus = typeof dispatchData.status === "string" ? dispatchData.status : "assigned";

    if (currentStatus === "closed") {
      return Response.json({ ok: true, alreadyClosed: true });
    }

    if (currentStatus !== "completed") {
      return Response.json(
        { error: "Order must be completed before closing the channel." },
        { status: 409 },
      );
    }

    await deleteSupplierChannel(body.threadId);

    await dispatchRef.set(
      {
        status: "closed",
        closedAt: FieldValue.serverTimestamp(),
        closedByUid: body.closedByUid ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not close supplier channel.";
    return Response.json({ error: message }, { status: 500 });
  }
}
