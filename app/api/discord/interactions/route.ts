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
                    label: "Criar/Vincular conta",
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

function getSupplierApplySuccessMessage(result: {
  configured: boolean;
  linkRequired: boolean;
  registrationUrl: string | null;
  dmQueued: boolean;
}) {
  if (!result.configured) {
    return "Application submitted. Automatic account-linking is temporarily unavailable. Ask an admin to configure WALLET_BACKEND_URL before payouts can be credited.";
  }

  if (!result.linkRequired) {
    return "Application submitted successfully. The admin can now select you for this order.";
  }

  if (result.registrationUrl && result.dmQueued) {
    return `Application submitted. We sent your secure link by DM, and you can also complete the linking now: ${result.registrationUrl}`;
  }

  if (result.registrationUrl) {
    return `Application submitted. Finish your site-linking flow here before receiving payouts: ${result.registrationUrl}`;
  }

  return "Application submitted. Your Discord account still needs to be linked to a site account before payouts can be credited.";
}

function getFriendlyApplyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("FIREBASE_PROJECT_ID") || message.includes("FIREBASE_CLIENT_EMAIL") || message.includes("FIREBASE_PRIVATE_KEY")) {
    return "Falha de configuracao no servidor (Firebase Admin env). Avise o admin para revisar FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no Vercel.";
  }

  if (message.includes("private key")) {
    return "Falha na chave privada do Firebase. Confira FIREBASE_PRIVATE_KEY no Vercel (formato com \\n).";
  }

  if (message.includes("The caller does not have permission") || message.includes("permission")) {
    return "Servico sem permissao no Firestore. Verifique a Service Account usada no FIREBASE_CLIENT_EMAIL.";
  }

  if (message.includes("requested entity was not found") || message.includes("project")) {
    return "Projeto Firebase nao encontrado. Confira FIREBASE_PROJECT_ID.";
  }

  return "Nao foi possivel registrar sua candidatura agora. Tente novamente.";
}

function getOnboardingFallbackMessage() {
  return "Application submitted successfully. Your account-linking step is temporarily unavailable. Contact an admin so they can verify WALLET_BACKEND_URL and WALLET_BACKEND_TOKEN.";
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

  try {
    const onboarding = await registerSupplierApplicationWithWalletBackend({
      orderId,
      discordId: user.id,
      discordUsername: user.username,
      discordGlobalName: payload.member?.nick ?? user.global_name ?? null,
    });

    return responseMessage(getSupplierApplySuccessMessage(onboarding), onboarding.registrationUrl);
  } catch (error) {
    console.error("[Discord Interactions] Candidate saved, but wallet onboarding failed:", error);
    return responseMessage(getOnboardingFallbackMessage());
  }
}
