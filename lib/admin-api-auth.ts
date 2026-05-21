import { getAdminAuth } from "@/lib/firebase-admin";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireAuthenticatedAdminRequest(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Missing Firebase authorization token.");
  }

  const adminAuth = getAdminAuth();
  return adminAuth.verifyIdToken(token);
}

export async function requireAuthenticatedUserRequest(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Missing Firebase authorization token.");
  }

  const adminAuth = getAdminAuth();
  return adminAuth.verifyIdToken(token);
}