import { createPublicKey, verify } from "crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

const DISCORD_PING = 1;
const DISCORD_COMPONENT = 3;
const DISCORD_PONG_RESPONSE = 1;
const DISCORD_MESSAGE_RESPONSE = 4;
const DISCORD_EPHEMERAL_FLAG = 1 << 6;

const PUBLIC_KEY_DER_PREFIX = "302a300506032b6570032100";

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

function isDiscordRequestValid(signature: string, timestamp: string, body: string): boolean {
  const publicKeyHex = getDiscordPublicKey();
  const publicKeyDer = Buffer.concat([
    Buffer.from(PUBLIC_KEY_DER_PREFIX, "hex"),
    Buffer.from(publicKeyHex, "hex"),
  ]);

  const keyObject = createPublicKey({
    key: publicKeyDer,
    format: "der",
    type: "spki",
  });

  return verify(
    null,
    Buffer.from(timestamp + body, "utf8"),
    keyObject,
    Buffer.from(signature, "hex"),
  );
}

function responseMessage(content: string) {
  return Response.json({
    type: DISCORD_MESSAGE_RESPONSE,
    data: {
      content,
      flags: DISCORD_EPHEMERAL_FLAG,
    },
  });
}

async function saveDiscordCandidate(orderId: string, user: DiscordInteractionUser, member?: DiscordInteractionMember) {
  const adminDb = getAdminDb();
  const displayName = member?.nick?.trim() || user.global_name?.trim() || user.username;
  const now = Date.now();
  const applicationId = `${orderId}_${user.id}`;

  await adminDb.collection("order-applications").doc(applicationId).set(
    {
      applicationId,
      orderId,
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
    isValid = isDiscordRequestValid(signature, timestamp, rawBody);
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
    return responseMessage("Candidatura enviada com sucesso. O admin ja pode te selecionar na ordem.");
  } catch (error) {
    console.error("[Discord Interactions] Could not save candidate:", error);
    return responseMessage("Nao foi possivel registrar sua candidatura agora. Tente novamente.");
  }
}
