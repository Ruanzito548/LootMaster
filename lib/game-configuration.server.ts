import { cookies } from "next/headers";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  GAME_CONFIGURATION_COLLECTION,
  GAME_CONFIGURATION_DOC_ID,
  buildDefaultGameConfiguration,
  sanitizeGameConfiguration,
  type GameConfiguration,
} from "@/lib/game-configuration";

const SESSION_COOKIE_NAME = "__session";

export async function getLiveGameConfiguration(): Promise<GameConfiguration> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection(GAME_CONFIGURATION_COLLECTION).doc(GAME_CONFIGURATION_DOC_ID).get();

  if (!snapshot.exists) {
    return buildDefaultGameConfiguration();
  }

  return sanitizeGameConfiguration(snapshot.data());
}

export async function isCurrentSessionAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();

  if (!sessionCookie) {
    return false;
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (decoded.isAdmin === true) {
      return true;
    }

    const adminDb = getAdminDb();
    const profileDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const profileData = profileDoc.exists ? (profileDoc.data() as Record<string, unknown>) : null;

    return profileData?.isAdmin === true;
  } catch {
    return false;
  }
}
