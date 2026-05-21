import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { sendSupplierPayoutMessage } from "@/lib/discord-bot";
import { getAdminDb } from "@/lib/firebase-admin";
import { forwardOrderCompletionToWalletBackend } from "@/lib/wallet-backend";

type RequestBody = {
  orderId: string;
  threadId: string;
  completedByUid?: string;
  idempotencyKey?: string;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function resolveSupplierUidForDispatch(
  adminDb: ReturnType<typeof getAdminDb>,
  orderId: string,
  dispatchData: Record<string, unknown>,
): Promise<string | null> {
  const selectedApplicationId =
    typeof dispatchData.selectedApplicationId === "string"
      ? dispatchData.selectedApplicationId.trim()
      : "";

  if (selectedApplicationId) {
    const directDoc = await adminDb.collection("order-applications").doc(selectedApplicationId).get();

    if (directDoc.exists) {
      const directData = directDoc.data() as Record<string, unknown>;
      if (typeof directData.uid === "string" && directData.uid.trim()) {
        return directData.uid.trim();
      }
    }

    const byFieldSnapshot = await adminDb
      .collection("order-applications")
      .where("orderId", "==", orderId)
      .where("applicationId", "==", selectedApplicationId)
      .limit(1)
      .get();

    if (!byFieldSnapshot.empty) {
      const row = byFieldSnapshot.docs[0].data() as Record<string, unknown>;
      if (typeof row.uid === "string" && row.uid.trim()) {
        return row.uid.trim();
      }
    }
  }

  const supplierDiscordId =
    typeof dispatchData.selectedSupplierDiscordUserId === "string"
      ? dispatchData.selectedSupplierDiscordUserId.trim()
      : "";

  if (!supplierDiscordId) {
    return null;
  }

  const userSnapshot = await adminDb
    .collection("users")
    .where("discordId", "==", supplierDiscordId)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    return null;
  }

  return userSnapshot.docs[0].id;
}

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
    const dispatchData = dispatchSnapshot.exists
      ? (dispatchSnapshot.data() as Record<string, unknown>)
      : null;

    if (dispatchData?.status === "completed" && dispatchData.lootCoinsPayoutCredited === true) {
      return Response.json({ ok: true, alreadyCompleted: true, payoutCredited: true });
    }

    const supplierUid = dispatchData
      ? await resolveSupplierUidForDispatch(adminDb, body.orderId, dispatchData)
      : null;

    if (!supplierUid) {
      return Response.json(
        { error: "Could not resolve supplier account for payout credit." },
        { status: 409 },
      );
    }

    const orderCheckoutRef = adminDb.collection("order-checkouts").doc(body.orderId);
    const orderCheckoutSnapshot = await orderCheckoutRef.get();
    const checkoutData = orderCheckoutSnapshot.exists
      ? (orderCheckoutSnapshot.data() as Record<string, unknown>)
      : null;

    const amountTotalCents = toFiniteNumber(checkoutData?.amountTotalCents, 0);
    const commissionPercent = toFiniteNumber(checkoutData?.commissionPercent, 15);
    const sellerAmountCentsRaw = toFiniteNumber(checkoutData?.sellerAmountCents, Number.NaN);
    const payoutCents = Number.isFinite(sellerAmountCentsRaw)
      ? Math.max(0, Math.round(sellerAmountCentsRaw))
      : Math.max(0, Math.round(amountTotalCents * (1 - commissionPercent / 100)));
    const payoutLootCoins = Math.round((payoutCents / 100) * 100) / 100;

    const payoutReference = `order-payout:${body.orderId}`;
    const payoutDocRef = adminDb.collection("order-payouts").doc(body.orderId);

    const payoutCreditedNow = await adminDb.runTransaction(async (tx) => {
      const payoutSnapshot = await tx.get(payoutDocRef);

      if (payoutSnapshot.exists) {
        return false;
      }

      const supplierRef = adminDb.collection("users").doc(supplierUid);

      tx.set(
        supplierRef,
        {
          lootCoins: FieldValue.increment(payoutLootCoins),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        payoutDocRef,
        {
          orderId: body.orderId,
          supplierUid,
          payoutLootCoins,
          payoutCents,
          currency: typeof checkoutData?.currency === "string" ? checkoutData.currency : "usd",
          reference: payoutReference,
          completedByUid: body.completedByUid ?? null,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        dispatchRef,
        {
          orderId: body.orderId,
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          completedByUid: body.completedByUid ?? null,
          updatedAt: FieldValue.serverTimestamp(),
          completionIdempotencyKey: body.idempotencyKey ?? null,
          lootCoinsPayoutCredited: true,
          lootCoinsPayoutAmount: payoutLootCoins,
          lootCoinsPayoutReference: payoutReference,
        },
        { merge: true },
      );

      return true;
    });

    if (payoutCreditedNow) {
      const appUrl = process.env.APP_URL?.trim();
      const profileUrl = appUrl
        ? `${appUrl.replace(/\/$/, "")}/profile`
        : new URL("/profile", request.url).toString();

      try {
        await sendSupplierPayoutMessage({
          channelId: body.threadId,
          orderId: body.orderId,
          payoutLootCoins,
          supplierDiscordUserId:
            typeof dispatchData?.selectedSupplierDiscordUserId === "string"
              ? dispatchData.selectedSupplierDiscordUserId
              : null,
          profileUrl,
        });
      } catch (error) {
        console.error("[Admin Complete Supplier] Could not send payout message to supplier channel:", error);
      }
    }

    let walletForwarded = false;
    let walletWarning: string | null = null;

    try {
      const walletBackend = await forwardOrderCompletionToWalletBackend(body);
      walletForwarded = walletBackend.forwarded;
    } catch (error) {
      walletWarning = error instanceof Error ? error.message : "Wallet backend completion sync failed.";
      console.error("[Admin Complete Supplier] Wallet backend completion sync failed:", error);
    }

    return Response.json({ ok: true, walletForwarded, walletWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete supplier payout flow.";
    return Response.json({ error: message }, { status: 500 });
  }
}
