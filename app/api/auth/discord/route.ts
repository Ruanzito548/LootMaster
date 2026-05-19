import { NextRequest, NextResponse } from "next/server";

function encodeState(linkToken: string | null) {
  if (!linkToken) {
    return null;
  }

  return Buffer.from(JSON.stringify({ linkToken }), "utf8").toString("base64url");
}

/**
 * GET /api/auth/discord
 * Redirects the user to Discord's OAuth2 authorization page.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const linkToken = request.nextUrl.searchParams.get("linkToken")?.trim() ?? null;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Discord OAuth is not configured on this server." },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });

  const encodedState = encodeState(linkToken);
  if (encodedState) {
    params.set("state", encodedState);
  }

  return NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`,
  );
}
