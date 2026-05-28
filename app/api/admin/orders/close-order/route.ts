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
    const channelClosed = dispatchData.channelClosed === true;

    if (channelClosed) {
      return Response.json({ ok: true, alreadyClosed: true });
    }

    if (currentStatus !== "paid" && currentStatus !== "completed") {
      return Response.json(
        { error: "Order must be paid before marking as completed." },
        { status: 409 },
      );
    }

    const feeTransferRef = adminDb.collection("fee-transfers").doc(body.orderId);
    let agentPayoutCreditedNow = false;

    await adminDb.runTransaction(async (tx) => {
      const feeTransferSnapshot = await tx.get(feeTransferRef);

      if (!feeTransferSnapshot.exists) {
        return;
      }

      const feeTransferData = feeTransferSnapshot.data() as Record<string, unknown>;
      const alreadyCredited =
        feeTransferData.agentPayoutCredited === true || feeTransferData.status === "processed";

      if (alreadyCredited) {
        return;
      }

      const agentUid =
        typeof feeTransferData.agentUid === "string" ? feeTransferData.agentUid.trim() : "";
      const payoutLootCoinsRaw =
        typeof feeTransferData.agentPayoutLootCoins === "number"
          ? feeTransferData.agentPayoutLootCoins
          : typeof feeTransferData.agentPayoutCents === "number"
          ? feeTransferData.agentPayoutCents / 100
          : 0;
      const payoutLootCoins =
        Number.isFinite(payoutLootCoinsRaw) && payoutLootCoinsRaw > 0
          ? Math.round(payoutLootCoinsRaw * 100) / 100
          : 0;

      if (agentUid && payoutLootCoins > 0) {
        tx.set(
          adminDb.collection("users").doc(agentUid),
          {
            lootCoins: FieldValue.increment(payoutLootCoins),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      tx.set(
        feeTransferRef,
        {
          status: "processed",
          agentPayoutCredited: true,
          agentPayoutCreditedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      agentPayoutCreditedNow = true;
    });

    await deleteSupplierChannel(body.threadId);

    let walletForwarded = false;
    let walletWarning: string | null = null;

    try {
      const walletBackend = await forwardOrderCompletionToWalletBackend({
        orderId: body.orderId,
        threadId: body.threadId,
        completedByUid: body.completedByUid,
        idempotencyKey: body.idempotencyKey,
      });
      walletForwarded = walletBackend.forwarded;
    } catch (error) {
      walletWarning = error instanceof Error ? error.message : "Wallet backend completion sync failed.";
      console.error("[Admin Close Order] Wallet backend completion sync failed:", error);
    }

    await dispatchRef.set(
      {
        status: "completed",
        channelClosed: true,
        completedAt: FieldValue.serverTimestamp(),
        completedByUid: body.completedByUid ?? null,
        completionIdempotencyKey: body.idempotencyKey ?? null,
        closedAt: FieldValue.serverTimestamp(),
        closedByUid: body.completedByUid ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return Response.json({ ok: true, walletForwarded, walletWarning, agentPayoutCreditedNow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not close supplier channel.";
    return Response.json({ error: message }, { status: 500 });
  }
}
