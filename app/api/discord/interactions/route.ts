import { verifyKey } from "discord-interactions";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { registerSupplierApplicationWithWalletBackend } from "@/lib/wallet-backend";

export const runtime = "nodejs";

const DISCORD_PING = 1;
const DISCORD_COMPONENT = 3;
const DISCORD_PONG_RESPONSE = 1;
const DISCORD_MESSAGE_RESPONSE = 4;
const DISCORD_EPHEMERAL_FLAG = 1 << 6;

type DiscordInteractionUser = {
  id: string;
  username: string;
  global_name?: string | null;
};

type DiscordInteractionMember = {
  nick?: string | null;
  user?: DiscordInteractionUser;
};

type DiscordInteractionPayload = {
  id: string;
  type: number;
  data?: {
    custom_id?: string;
  };
  user?: DiscordInteractionUser;
  member?: DiscordInteractionMember;
};

function getDiscordPublicKey(): string {
  const key = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!key) {
    throw new Error("DISCORD_PUBLIC_KEY is not configured.");
  }
  return key;
}

async function isDiscordRequestValid(signature: string, timestamp: string, body: string): Promise<boolean> {
  const publicKey = getDiscordPublicKey();
  return await verifyKey(body, signature, timestamp, publicKey);
}

function responseMessage(content: string, registrationUrl?: string | null) {
  const url = registrationUrl?.trim() ?? "";

  return Response.json({
    type: DISCORD_MESSAGE_RESPONSE,
    data: {
      content,
      flags: DISCORD_EPHEMERAL_FLAG,
      ...(url
        ? {
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 5,
                    label: "Create/Link account",
                    url,
                  },
                ],
              },
            ],
          }
        : {}),
    },
  });
}

async function hasSiteAccountForDiscord(discordId: string): Promise<boolean> {
  const adminDb = getAdminDb();
  const normalizedDiscordId = discordId.trim();

  if (!normalizedDiscordId) {
    return false;
  }

  const discordUidDoc = await adminDb.collection("users").doc(`discord:${normalizedDiscordId}`).get();
  if (discordUidDoc.exists) {
    return true;
  }

  const byDiscordId = await adminDb
    .collection("users")
    .where("discordId", "==", normalizedDiscordId)
    .limit(1)
    .get();

  return !byDiscordId.empty;
}

function getSupplierApplySuccessMessage(result: {
  configured: boolean;
  linkRequired: boolean;
  registrationUrl: string | null;
  dmQueued: boolean;
}, hasSiteAccount: boolean) {
  if (!result.configured) {
    return hasSiteAccount
      ? "Application submitted successfully. We found your site account. Automatic linking is temporarily unavailable, but an admin can still select you normally."
      : "Application submitted successfully. We could not find a site account for this Discord user. Create your account to unlock payout credits when selected.";
  }

  if (!result.linkRequired) {
    return "Application submitted successfully. Your site account is already ready, and the admin can select you for this order.";
  }

  if (hasSiteAccount) {
    if (result.registrationUrl && result.dmQueued) {
      return `Application submitted. We found your account, but Discord linking still needs to be completed. We sent the link by DM, and you can complete it now: ${result.registrationUrl}`;
    }

    if (result.registrationUrl) {
      return `Application submitted. Your account exists, but Discord linking must be completed before receiving payouts: ${result.registrationUrl}`;
    }

    return "Application submitted. Your account exists, but Discord is not linked yet for payout credits.";
  }

  if (result.registrationUrl && result.dmQueued) {
    return `Application submitted. We could not find your site account. We sent a DM link so you can create/link your account: ${result.registrationUrl}`;
  }

  if (result.registrationUrl) {
    return `Application submitted. Create/link your site account to receive payouts: ${result.registrationUrl}`;
  }

  return "Application submitted. This Discord user does not have a site account/link yet for payouts.";
}

function getFriendlyApplyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("FIREBASE_PROJECT_ID") || message.includes("FIREBASE_CLIENT_EMAIL") || message.includes("FIREBASE_PRIVATE_KEY")) {
    return "Server configuration failure (Firebase Admin env). Ask the admin to review FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel.";
  }

  if (message.includes("private key")) {
    return "Firebase private key failure. Check FIREBASE_PRIVATE_KEY in Vercel (escaped \\n format).";
  }

  if (message.includes("The caller does not have permission") || message.includes("permission")) {
    return "Service has no permission in Firestore. Verify the service account used in FIREBASE_CLIENT_EMAIL.";
  }

  if (message.includes("requested entity was not found") || message.includes("project")) {
    return "Firebase project not found. Check FIREBASE_PROJECT_ID.";
  }

  return "Could not register your application right now. Please try again.";
}

function getOnboardingFallbackMessage(hasSiteAccount: boolean) {
  return hasSiteAccount
    ? "Application submitted successfully. We identified your site account. Automatic linking is temporarily unavailable, but the admin can continue with your selection."
    : "Application submitted successfully. We could not find a site account for this Discord user. Create your account to ensure payout credit when selected.";
}

function getFallbackSignupUrl(request: Request) {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/cadastro`;
  }

  try {
    return new URL("/cadastro", request.url).toString();
  } catch {
    return null;
  }
}

async function saveDiscordCandidate(orderId: string, user: DiscordInteractionUser, member?: DiscordInteractionMember) {
  const normalizedOrderId = orderId.trim();
  const adminDb = getAdminDb();
  const displayName = member?.nick?.trim() || user.global_name?.trim() || user.username;
  const now = Date.now();
  const applicationId = `${normalizedOrderId}_${user.id}`;

  await adminDb.collection("order-applications").doc(applicationId).set(
    {
      applicationId,
      orderId: normalizedOrderId,
      uid: `discord:${user.id}`,
      supplierName: displayName,
      supplierEmail: "",
      supplierDiscordHandle: user.username,
      supplierDiscordUserId: user.id,
      gameTitle: "",
      categoryTitle: "",
      goldAmount: 0,
      server: "-",
      faction: "-",
      nickname: "-",
      finalAmountCents: 0,
      currency: "brl",
      status: "applied",
      source: "discord-button",
      appliedAtMs: now,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  if (!signature || !timestamp) {
    return new Response("Missing Discord signature headers.", { status: 401 });
  }

  let isValid = false;
  try {
    isValid = await isDiscordRequestValid(signature, timestamp, rawBody);
  } catch (error) {
    console.error("[Discord Interactions] Signature setup error:", error);
    return new Response("Invalid interaction setup.", { status: 500 });
  }

  if (!isValid) {
    return new Response("Invalid request signature.", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as DiscordInteractionPayload;

  if (payload.type === DISCORD_PING) {
    return Response.json({ type: DISCORD_PONG_RESPONSE });
  }

  if (payload.type !== DISCORD_COMPONENT) {
    return responseMessage("Unsupported interaction type.");
  }

  const customId = payload.data?.custom_id ?? "";
  if (!customId.startsWith("apply_order:")) {
    return responseMessage("Unknown action.");
  }

  const orderId = customId.slice("apply_order:".length).trim();
  if (!orderId) {
    return responseMessage("Order ID is missing for this application.");
  }

  const user = payload.member?.user ?? payload.user;
  if (!user?.id || !user.username) {
    return responseMessage("Could not identify your Discord account.");
  }

  try {
    await saveDiscordCandidate(orderId, user, payload.member);
  } catch (error) {
    console.error("[Discord Interactions] Could not save candidate:", error);
    return responseMessage(getFriendlyApplyError(error));
  }

  let hasSiteAccount = false;
  try {
    hasSiteAccount = await hasSiteAccountForDiscord(user.id);
  } catch (error) {
    console.error("[Discord Interactions] Could not verify site account link:", error);
  }

  try {
    const onboarding = await registerSupplierApplicationWithWalletBackend({
      orderId,
      discordId: user.id,
      discordUsername: user.username,
      discordGlobalName: payload.member?.nick ?? user.global_name ?? null,
    });

    return responseMessage(
      getSupplierApplySuccessMessage(onboarding, hasSiteAccount),
      onboarding.registrationUrl,
    );
  } catch (error) {
    console.error("[Discord Interactions] Candidate saved, but wallet onboarding failed:", error);
    return responseMessage(
      getOnboardingFallbackMessage(hasSiteAccount),
      hasSiteAccount ? null : getFallbackSignupUrl(request),
    );
  }
}
