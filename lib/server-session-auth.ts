import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const SESSION_COOKIE_NAME = "__session";

export async function requireAuthenticatedAdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();

  if (!sessionCookie) {
    redirect("/login");
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (decoded.isAdmin === true) {
      return decoded;
    }

    const adminDb = getAdminDb();
    const profileDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const profileData = profileDoc.exists ? (profileDoc.data() as Record<string, unknown>) : null;

    if (profileData?.isAdmin === true) {
      return decoded;
    }

    redirect("/login");
  } catch {
    redirect("/login");
  }
}
