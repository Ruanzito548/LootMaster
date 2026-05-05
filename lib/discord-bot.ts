type CreatePrivateSupplierThreadInput = {
  orderId: string;
  supplierName: string;
  supplierDiscordUserId: string;
  supplierDiscordHandle: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  server: string;
  faction: string;
  nickname: string;
  totalLabel: string;
};

type DiscordThreadResponse = {
  id: string;
};

async function discordRequest(path: string, init: RequestInit) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.");
  }

  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord API request failed: ${response.status} - ${text}`);
  }

  return response;
}

export async function createPrivateSupplierThread(
  input: CreatePrivateSupplierThreadInput,
): Promise<{ threadId: string; threadUrl: string }> {
  const parentChannelId = process.env.DISCORD_SUPPLIER_THREAD_CHANNEL_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!parentChannelId || !guildId) {
    throw new Error("DISCORD_SUPPLIER_THREAD_CHANNEL_ID or DISCORD_GUILD_ID is not configured.");
  }

  const threadName = `order-${input.orderId.slice(-8)}-${input.supplierName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 80);

  const createResponse = await discordRequest(`/channels/${parentChannelId}/threads`, {
    method: "POST",
    body: JSON.stringify({
      name: threadName,
      auto_archive_duration: 1440,
      type: 12,
      invitable: false,
    }),
  });

  const thread = (await createResponse.json()) as DiscordThreadResponse;

  await discordRequest(`/channels/${thread.id}/thread-members/${input.supplierDiscordUserId}`, {
    method: "PUT",
    body: JSON.stringify({}),
  });

  const introLines = [
    `Supplier selected: ${input.supplierName}${input.supplierDiscordHandle ? ` (${input.supplierDiscordHandle})` : ""}`,
    `Order ID: ${input.orderId}`,
    `Order: ${input.gameTitle} / ${input.categoryTitle}`,
    `Gold Amount: ${input.goldAmount.toLocaleString("en-US")} gold`,
    `Server: ${input.server}`,
    `Faction: ${input.faction}`,
    `Character: ${input.nickname}`,
    `Order Total: ${input.totalLabel}`,
    "Use this private thread to collect the supplier payout details and complete internal coordination.",
  ];

  await discordRequest(`/channels/${thread.id}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: introLines.join("\n"),
    }),
  });

  return {
    threadId: thread.id,
    threadUrl: `https://discord.com/channels/${guildId}/${thread.id}`,
  };
}