import { FieldValue } from "firebase-admin/firestore";

import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { writeActivityLog } from "@/lib/activity-history.server";
import { getAdminDb } from "@/lib/firebase-admin";

type RequestBody = {
  amount?: number;
  fullName?: string;
  payoutMethod?: string;
  payoutReference?: string;
  confirmHighValue?: boolean;
};

const HIGH_VALUE_CONFIRMATION_THRESHOLD = 100;

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPixKey(value: string): boolean {
  if (value.length > 254) {
    return false;
  }

  const digitsOnly = value.replace(/[.\-()\s]/g, "");
  const isCpf = /^\d{11}$/.test(digitsOnly);
  const isPhone = /^\+?\d{10,13}$/.test(value.replace(/[\s()-]/g, ""));
  const isRandomKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  return isCpf || isPhone || isRandomKey || isEmail(value);
}

function isUsdtWalletAddress(value: string): boolean {
  return /^(T[1-9A-HJ-NP-Za-km-z]{33}|0x[a-fA-F0-9]{40})$/.test(value);
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

export async function POST(request: Request): Promise<Response> {
  let decodedToken: Awaited<ReturnType<typeof requireAuthenticatedUserRequest>>;
  let body: RequestBody;

  try {
    decodedToken = await requireAuthenticatedUserRequest(request);
    body = (await request.json()) as RequestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json(
      { error: status === 401 ? "Unauthorized request." : "Invalid request body." },
      { status },
    );
  }

  const amount = toFiniteNumber(body.amount);
  const fullName = (body.fullName ?? "").trim();
  const payoutMethod = (body.payoutMethod ?? "").trim();
  const payoutReference = (body.payoutReference ?? "").trim();
  const confirmHighValue = body.confirmHighValue === true;

  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Invalid withdraw amount." }, { status: 422 });
  }

  if (!fullName) {
    return Response.json({ error: "Nome completo é obrigatório." }, { status: 422 });
  }

  if (fullName.length > 50) {
    return Response.json({ error: "O nome completo deve ter no máximo 50 caracteres." }, { status: 422 });
  }

  if (!(payoutMethod === "pix" || payoutMethod === "paypal" || payoutMethod === "crypto-usdt")) {
    return Response.json({ error: "Payout method is required." }, { status: 422 });
  }

  if (!payoutReference) {
    return Response.json({ error: "Payout destination is required." }, { status: 422 });
  }

  if (payoutMethod === "paypal" && !isEmail(payoutReference)) {
    return Response.json({ error: "PayPal method requires a valid email address." }, { status: 422 });
  }

  if (payoutMethod === "pix" && !isPixKey(payoutReference)) {
    return Response.json({ error: "PIX method requires a valid PIX key." }, { status: 422 });
  }

  if (payoutMethod === "crypto-usdt" && !isUsdtWalletAddress(payoutReference)) {
    return Response.json({ error: "USDT method requires a valid wallet address." }, { status: 422 });
  }

  const normalizedAmount = Math.round(amount * 100) / 100;

  if (normalizedAmount > HIGH_VALUE_CONFIRMATION_THRESHOLD && !confirmHighValue) {
    return Response.json({ error: "Additional confirmation is required for withdrawals above 100 Loot Coins." }, { status: 428 });
  }

  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const withdrawRef = adminDb.collection("withdraw-requests").doc();

    const result = await adminDb.runTransaction(async (tx) => {
      const userSnapshot = await tx.get(userRef);

      if (!userSnapshot.exists) {
        throw new Error("User profile not found.");
      }

      const userData = userSnapshot.data() as Record<string, unknown>;
      const currentLootCoins =
        typeof userData.lootCoins === "number" && Number.isFinite(userData.lootCoins)
          ? userData.lootCoins
          : 0;

      if (currentLootCoins < normalizedAmount) {
        throw new Error("Insufficient Loot Coins balance.");
      }

      const nextLootCoins = Math.round((currentLootCoins - normalizedAmount) * 100) / 100;
      const currentTransactions = Array.isArray(userData.transactions)
        ? (userData.transactions as unknown[])
        : [];

      const transactionItem = {
        id: `wd-${withdrawRef.id}`,
        title: `Withdrawal request (${payoutMethod})`,
        type: "sale",
        status: "Pending",
        value: `-${normalizedAmount.toFixed(2)} Loot Coins`,
        createdAtLabel: "Now",
      };

      const nextTransactions = [transactionItem, ...currentTransactions].slice(0, 100);

      tx.set(
        userRef,
        {
          lootCoins: nextLootCoins,
          transactions: nextTransactions,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(withdrawRef, {
        requestId: withdrawRef.id,
        uid: decodedToken.uid,
        email: decodedToken.email ?? "",
        fullName,
        amount: normalizedAmount,
        currency: "LOOT",
        status: "pending_review",
        payoutMethod,
        payoutReference,
        source: "site-profile",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      writeActivityLog(tx, adminDb, {
        userUid: decodedToken.uid,
        actorUid: decodedToken.uid,
        actorRole: "user",
        actionType: "withdrawal_requested",
        category: "economy",
        description: `Requested withdrawal of ${normalizedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Loot Coins via ${payoutMethod.toUpperCase()}.`,
        quantity: 1,
        value: normalizedAmount,
        valueUnit: "loot",
        origin: "profile:withdraw",
        status: "pending",
        tags: ["economy", "withdrawal", payoutMethod],
        metadata: {
          requestId: withdrawRef.id,
          payoutMethod,
        },
      });

      return {
        requestId: withdrawRef.id,
        nextLootCoins,
      };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create withdraw request.";
    const status = message.includes("Insufficient") ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
}
