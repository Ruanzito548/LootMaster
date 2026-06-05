import { requireAuthenticatedUserRequest } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: Request): Promise<Response> {
  try {
    const decodedToken = await requireAuthenticatedUserRequest(request);
    const adminDb = getAdminDb();

    const query = adminDb.collection("reward-history").where("uid", "==", decodedToken.uid);

    const countSnapshot = await query.count().get();
    const totalOpenings = countSnapshot.data().count;

    return Response.json({ ok: true, totalOpenings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load chest stats.";
    const status =
      message.includes("authorization") || message.includes("token")
        ? 401
        : 500;

    return Response.json({ error: message }, { status });
  }
}
