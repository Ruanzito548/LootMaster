import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { consumeDiscordLinkTokenWithWalletBackend } from "@/lib/wallet-backend";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
};

type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
};

function getAvatarUrl(user: DiscordUser): string {
  if (!user.avatar) {
    // Discord default avatar: (userId >> 22) % 6, computed without BigInt literals
    const defaultIndex = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

function getLinkTokenFromState(rawState: string | null): string | null {
  if (!rawState) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8")) as {
      linkToken?: unknown;
    };

    return typeof payload.linkToken === "string" && payload.linkToken.trim()
      ? payload.linkToken.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/discord/callback
 * Handles the Discord OAuth2 redirect, exchanges the code for a Firebase custom token,
 * and redirects the client to the login page where it completes sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const linkToken = getLinkTokenFromState(searchParams.get("state"));

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error ?? "access_denied")}`, request.url),
    );
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=server_misconfigured", request.url));
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
  }

  const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

  // Fetch Discord user info
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=user_fetch_failed", request.url));
  }

  const discordUser = (await userRes.json()) as DiscordUser;

  // Build a stable Firebase UID from the Discord ID
  const firebaseUid = `discord:${discordUser.id}`;

  const displayName =
    discordUser.global_name?.trim() ||
    discordUser.username.trim();

  const email = discordUser.email?.trim().toLowerCase() ?? null;
  const avatarUrl = getAvatarUrl(discordUser);

  // Upsert user profile in Firestore
  const db = getAdminDb();
  const userRef = db.collection("users").doc(firebaseUid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    await userRef.set({
      uid: firebaseUid,
      username: displayName,
      email: email ?? "",
      photoURL: avatarUrl,
      coverURL: "/wow/wow-classic-era/classic-era-wallpaper.avif",
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      lootCoins: 0,
      tickets: 0,
      keys: 0,
      inventory: [],
      transactions: [],
      totalSpentCents: 0,
      level: 1,
      levelXpCents: 0,
      nextLevelXpCents: 150,
      highestRewardedLevel: 1,
      recentUnlocks: [],
      lastXpGain: 0,
      lastSpendUsd: 0,
      lastProgressAt: "",
      lastLevelUpLevel: 0,
      lastLevelUpAt: "",
      dailyStreak: 1,
      seasonTrackTier: 1,
      achievementPoints: 0,
      authProvider: "discord",
      createdAt: new Date().toISOString(),
    });
  } else {
    // Always refresh Discord-sourced fields
    await userRef.update({
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      photoURL: avatarUrl,
      ...(displayName && { username: displayName }),
      ...(email && { email }),
    });
  }

  // Create Firebase custom token
  const adminAuth = getAdminAuth();
  const customToken = await adminAuth.createCustomToken(firebaseUid, {
    discordId: discordUser.id,
    discordUsername: discordUser.username,
  });

  if (linkToken) {
    try {
      await consumeDiscordLinkTokenWithWalletBackend({
        token: linkToken,
        siteUserId: firebaseUid,
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        email,
      });
    } catch (error) {
      console.error("[Discord OAuth] Could not consume wallet link token:", error);
    }
  }

  // Pass token to client via redirect
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("customToken", customToken);
  return NextResponse.redirect(redirectUrl);
}
