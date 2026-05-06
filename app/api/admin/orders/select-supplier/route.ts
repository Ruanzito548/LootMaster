import { createPrivateSupplierThread } from "@/lib/discord-bot";

type RequestBody = {
  orderId: string;
  supplierName: string;
  supplierDiscordHandle: string;
  supplierDiscordUserId?: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  server: string;
  faction: string;
  nickname: string;
  totalLabel: string;
  payoutLabel: string;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.orderId || !body.supplierName) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  try {
    const thread = await createPrivateSupplierThread(body);
    return Response.json(thread);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create supplier Discord thread.";
    return Response.json({ error: message }, { status: 500 });
  }
}