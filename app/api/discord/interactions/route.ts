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
      ? "Aplicacao enviada com sucesso. Encontramos sua conta no site. A vinculacao automatica esta temporariamente indisponivel, mas o admin ainda pode te selecionar normalmente."
      : "Aplicacao enviada com sucesso. Nao encontramos cadastro no site com este Discord. Crie sua conta para liberar o credito de payout quando for selecionado.";
  }

  if (!result.linkRequired) {
    return "Aplicacao enviada com sucesso. Sua conta ja esta pronta no site e o admin pode te selecionar para esta order.";
  }

  if (hasSiteAccount) {
    if (result.registrationUrl && result.dmQueued) {
      return `Aplicacao enviada. Encontramos sua conta, mas a vinculacao com Discord ainda precisa ser concluida. Enviamos o link por DM e voce pode concluir agora: ${result.registrationUrl}`;
    }

    if (result.registrationUrl) {
      return `Aplicacao enviada. Sua conta existe, mas falta concluir a vinculacao com Discord antes de receber payout: ${result.registrationUrl}`;
    }

    return "Aplicacao enviada. Sua conta existe, mas o Discord ainda nao esta vinculado para credito de payout.";
  }

  if (result.registrationUrl && result.dmQueued) {
    return `Aplicacao enviada. Nao encontramos seu cadastro no site. Enviamos um link por DM para criar/vincular sua conta: ${result.registrationUrl}`;
  }

  if (result.registrationUrl) {
    return `Aplicacao enviada. Crie/vincule sua conta no site para receber payout: ${result.registrationUrl}`;
  }

  return "Aplicacao enviada. Este Discord ainda nao possui cadastro/vinculo no site para receber payout.";
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

function getOnboardingFallbackMessage(hasSiteAccount: boolean) {
  return hasSiteAccount
    ? "Aplicacao enviada com sucesso. Identificamos sua conta no site. A etapa automatica de vinculacao esta temporariamente indisponivel, mas o admin pode seguir com sua selecao."
    : "Aplicacao enviada com sucesso. Nao encontramos cadastro no site para este Discord. Crie sua conta para garantir o recebimento de payout quando for selecionado.";
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
