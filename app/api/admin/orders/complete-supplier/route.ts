import { deleteSupplierChannel } from "@/lib/discord-bot";

type RequestBody = {
  orderId: string;
  threadId: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.orderId || !body.threadId) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  try {
    await deleteSupplierChannel(body.threadId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not close supplier Discord channel.";
    return Response.json({ error: message }, { status: 500 });
  }
}
