type CreatePrivateSupplierThreadInput = {
  orderId: string;
  supplierName: string;
  supplierDiscordUserId?: string;
  supplierDiscordHandle: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  server: string;
  faction: string;
  nickname: string;
  totalLabel: string;
};

type SendOrderNotificationInput = {
  channelId: string | null | undefined;
  sessionId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: string;
  server: string;
  faction: string;
  nickname: string;
  paymentMethod: string;
  finalAmountCents: string;
  currency: string;
  email: string;
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

  if (input.supplierDiscordUserId?.trim()) {
    await discordRequest(`/channels/${thread.id}/thread-members/${input.supplierDiscordUserId.trim()}`, {
      method: "PUT",
      body: JSON.stringify({}),
    });
  }

  const introLines = [
    `Supplier selected: ${input.supplierName}${input.supplierDiscordHandle ? ` (${input.supplierDiscordHandle})` : ""}`,
    `Order ID: ${input.orderId}`,
    `Order: ${input.gameTitle} / ${input.categoryTitle}`,
    `Gold Amount: ${input.goldAmount.toLocaleString("en-US")} gold`,
    `Server: ${input.server}`,
    `Faction: ${input.faction}`,
    `Character: ${input.nickname}`,
    `Order Total: ${input.totalLabel}`,
    input.supplierDiscordUserId?.trim()
      ? `Supplier Discord User ID: ${input.supplierDiscordUserId.trim()}`
      : "Supplier Discord User ID not provided. Share the thread link manually with the supplier.",
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

export async function sendOrderNotificationViaBot(input: SendOrderNotificationInput): Promise<void> {
  if (!input.channelId) {
    console.warn("[Discord Bot] No channel ID configured for this order - notification skipped.");
    return;
  }

  const amountLabel = (Number(input.finalAmountCents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: (input.currency || "BRL").toUpperCase(),
  });

  const methodLabel: Record<string, string> = {
    pix: "Pix",
    card: "Credit Card",
    balance: "LM Coins",
  };

  const fields = [
    { name: "Game", value: input.gameTitle || "-", inline: true },
    { name: "Category", value: input.categoryTitle || "-", inline: true },
    { name: "Gold Amount", value: `${Number(input.goldAmount || "0").toLocaleString("en-US")} gold`, inline: true },
    { name: "Server", value: input.server || "-", inline: true },
    { name: "Faction", value: input.faction || "-", inline: true },
    { name: "Character", value: input.nickname || "-", inline: true },
    { name: "Payment Method", value: methodLabel[input.paymentMethod] ?? input.paymentMethod ?? "-", inline: true },
    { name: "Amount Paid", value: amountLabel, inline: true },
    { name: "Customer Email", value: input.email || "-", inline: false },
    { name: "Session ID", value: `\`${input.sessionId}\``, inline: false },
  ];

  await discordRequest(`/channels/${input.channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      embeds: [
        {
          title: "Payment Confirmed",
          description: "A new paid order is ready for supplier applications. Click the button below to apply.",
          color: 0x39d4ff,
          fields,
          footer: { text: "Loot Master - Payment Gateway" },
          timestamp: new Date().toISOString(),
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "Candidatar-se",
              custom_id: `apply_order:${input.sessionId}`,
            },
          ],
        },
      ],
    }),
  });
}