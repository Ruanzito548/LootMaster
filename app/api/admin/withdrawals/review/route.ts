import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  requestId?: string;
  action?: "approve" | "reject";
  reason?: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;
  let adminToken: Awaited<ReturnType<typeof requireAuthenticatedAdminRequest>>;

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

  const requestId = (body.requestId ?? "").trim();
  const action = body.action;
  const reason = (body.reason ?? "").trim();

  if (!requestId || (action !== "approve" && action !== "reject")) {
    return Response.json({ error: "Missing or invalid review payload." }, { status: 422 });
  }

  try {
    const adminDb = getAdminDb();
    const withdrawRef = adminDb.collection("withdraw-requests").doc(requestId);

    const result = await adminDb.runTransaction(async (tx) => {
      const withdrawSnapshot = await tx.get(withdrawRef);
      if (!withdrawSnapshot.exists) {
        throw new Error("Withdraw request not found.");
      }

      const withdrawData = withdrawSnapshot.data() as Record<string, unknown>;
      const status = typeof withdrawData.status === "string" ? withdrawData.status : "pending_review";

      if (status !== "pending_review") {
        return {
          alreadyProcessed: true,
          status,
        };
      }

      const uid = typeof withdrawData.uid === "string" ? withdrawData.uid : "";
      const amount = typeof withdrawData.amount === "number" && Number.isFinite(withdrawData.amount)
        ? withdrawData.amount
        : 0;

      if (!uid || amount <= 0) {
        throw new Error("Withdraw request has invalid user or amount.");
      }

      const userRef = adminDb.collection("users").doc(uid);
      const userSnapshot = await tx.get(userRef);
      if (!userSnapshot.exists) {
        throw new Error("User profile not found for withdrawal review.");
      }

      const userData = userSnapshot.data() as Record<string, unknown>;
      const transactions = Array.isArray(userData.transactions)
        ? [...(userData.transactions as unknown[])]
        : [];
      const transactionId = `wd-${requestId}`;

      const nextStatusLabel = action === "approve" ? "Completed" : "Rejected";
      const transactionIndex = transactions.findIndex((item) => {
        if (!item || typeof item !== "object") {
          return false;
        }
        const row = item as Record<string, unknown>;
        return row.id === transactionId;
      });

      if (transactionIndex >= 0) {
        const row = transactions[transactionIndex] as Record<string, unknown>;
        transactions[transactionIndex] = {
          ...row,
          status: nextStatusLabel,
          createdAtLabel: "Just now",
        };
      }

      const withdrawUpdate: Record<string, unknown> = {
        status: action === "approve" ? "approved" : "rejected",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedByUid: adminToken.uid,
        reviewReason: reason || null,
        updatedAt: FieldValue.serverTimestamp(),
      };

      tx.set(withdrawRef, withdrawUpdate, { merge: true });

      if (action === "reject") {
        tx.set(
          userRef,
          {
            lootCoins: FieldValue.increment(amount),
            transactions,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        tx.set(
          userRef,
          {
            transactions,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      return {
        alreadyProcessed: false,
        status: action === "approve" ? "approved" : "rejected",
      };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not review withdraw request.";
    return Response.json({ error: message }, { status: 500 });
  }
}
