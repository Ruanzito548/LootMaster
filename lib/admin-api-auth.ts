import { cookies } from "next/headers";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireAuthenticatedAdminRequest(request: Request) {
  const decodedToken = await requireAuthenticatedUserRequest(request);
  const claimIsAdmin = decodedToken.isAdmin === true;

  if (claimIsAdmin) {
    return decodedToken;
  }

  const adminDb = getAdminDb();
  const profileDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  const profileData = profileDoc.exists ? (profileDoc.data() as Record<string, unknown>) : null;

  if (profileData?.isAdmin === true) {
    return decodedToken;
  }

  throw new Error("Invalid admin token role.");
}

export async function requireAuthenticatedUserRequest(request: Request) {
  const token = getBearerToken(request);
  const adminAuth = getAdminAuth();

  if (token) {
    return adminAuth.verifyIdToken(token);
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value?.trim();
  if (sessionCookie) {
    return adminAuth.verifySessionCookie(sessionCookie, true);
  }

  throw new Error("Missing Firebase authorization token.");
}