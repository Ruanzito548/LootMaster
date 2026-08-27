import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: Request): Promise<Response> {
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!code || code.length > 100) {
    return Response.json({ error: "Invalid exchange code." }, { status: 400 });
  }

  try {
    const ref = getAdminDb().collection("auth-handoffs").doc(code);
    const customToken = await getAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data() as Record<string, unknown> | undefined;
      if (!snapshot.exists || typeof data?.customToken !== "string" || typeof data.expiresAt !== "number" || data.expiresAt < Date.now()) {
        throw new Error("Invalid exchange code.");
      }
      transaction.delete(ref);
      return data.customToken;
    });

    return Response.json({ customToken }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid or expired exchange code." }, { status: 401 });
  }
}