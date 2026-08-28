import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/auth/discord
 * Redirects the user to Discord's OAuth2 authorization page.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.NODE_ENV === "production"
    ? "https://lootmaster.gg/api/auth/discord/callback"
    : process.env.DISCORD_REDIRECT_URI?.trim() || "http://localhost:3000/api/auth/discord/callback";
  const linkToken = request.nextUrl.searchParams.get("linkToken")?.trim() || null;

  if (!clientId || !/^\d{17,20}$/.test(clientId.trim())) {
    return NextResponse.json(
      { error: "Discord OAuth is misconfigured: DISCORD_CLIENT_ID must be the numeric Application ID." },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });

  const state = crypto.randomUUID();
  await getAdminDb().collection("oauth-states").doc(state).set({
    linkToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60_000,
  });
  params.set("state", state);

  return NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`,
  );
}
