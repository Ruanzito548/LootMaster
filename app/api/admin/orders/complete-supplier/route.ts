import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { deleteSupplierChannel } from "@/lib/discord-bot";
import { getAdminDb } from "@/lib/firebase-admin";
import { forwardOrderCompletionToWalletBackend } from "@/lib/wallet-backend";

type RequestBody = {
  orderId: string;
  threadId: string;
  completedByUid?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as RequestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: status === 401 ? "Unauthorized request." : "Invalid request body." }, { status });
  }

  if (!body.orderId || !body.threadId) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const dispatchRef = adminDb.collection("order-dispatches").doc(body.orderId);
    const dispatchSnapshot = await dispatchRef.get();

    if (dispatchSnapshot.exists) {
      const dispatchData = dispatchSnapshot.data() as Record<string, unknown>;
      if (dispatchData.status === "completed") {
        return Response.json({ ok: true, alreadyCompleted: true });
      }
    }

    await deleteSupplierChannel(body.threadId);

    await dispatchRef.set(
      {
        orderId: body.orderId,
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        completedByUid: body.completedByUid ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        completionIdempotencyKey: body.idempotencyKey ?? null,
      },
      { merge: true },
    );

    const walletBackend = await forwardOrderCompletionToWalletBackend(body);

    return Response.json({ ok: true, walletForwarded: walletBackend.forwarded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not close supplier Discord channel.";
    return Response.json({ error: message }, { status: 500 });
  }
}
