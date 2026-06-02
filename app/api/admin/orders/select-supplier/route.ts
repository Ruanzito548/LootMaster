import { requireAuthenticatedAdminRequest } from "@/lib/admin-api-auth";
import { createPrivateSupplierThread } from "@/lib/discord-bot";
import { deleteSupplierChannel } from "@/lib/discord-bot";
import { assignSupplierToOrderInWalletBackend } from "@/lib/wallet-backend";

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
  previousThreadId?: string;
  closePreviousThread?: boolean;
};

export async function POST(request: Request): Promise<Response> {
  let body: RequestBody;

  try {
    await requireAuthenticatedAdminRequest(request);
    body = (await request.json()) as RequestBody;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized request.";
    const status = message.includes("authorization") || message.includes("token") ? 401 : 400;
    return Response.json({ error: status === 401 ? "Unauthorized request." : "Invalid request body." }, { status });
  }

  if (!body.orderId || !body.supplierName) {
    return Response.json({ error: "Missing required fields." }, { status: 422 });
  }

  try {
    const thread = await createPrivateSupplierThread(body);
    let walletAssignmentWarning: string | null = null;
    let previousThreadCloseWarning: string | null = null;

    if (body.supplierDiscordUserId?.trim()) {
      try {
        await assignSupplierToOrderInWalletBackend({
          orderId: body.orderId,
          supplierDiscordId: body.supplierDiscordUserId.trim(),
          supplierDiscordUsername: body.supplierDiscordHandle,
        });
      } catch (error) {
        walletAssignmentWarning =
          error instanceof Error
            ? error.message
            : "Wallet backend supplier assignment failed.";
        console.error("[Admin Select Supplier] Wallet backend assignment failed:", error);
      }
    }

    const shouldClosePreviousThread =
      body.closePreviousThread === true &&
      Boolean(body.previousThreadId?.trim()) &&
      body.previousThreadId?.trim() !== thread.threadId;

    if (shouldClosePreviousThread) {
      try {
        await deleteSupplierChannel(body.previousThreadId!.trim());
      } catch (error) {
        previousThreadCloseWarning =
          error instanceof Error
            ? error.message
            : "Could not close previous supplier channel.";
        console.error("[Admin Select Supplier] Previous channel close failed:", error);
      }
    }

    return Response.json({
      ...thread,
      walletAssignmentWarning,
      previousThreadCloseWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create supplier Discord thread.";
    return Response.json({ error: message }, { status: 500 });
  }
}