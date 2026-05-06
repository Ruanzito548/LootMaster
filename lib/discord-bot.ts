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

  const mentionPart = input.supplierDiscordUserId?.trim()
    ? `<@${input.supplierDiscordUserId.trim()}>`
    : null;

  await discordRequest(`/channels/${thread.id}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: mentionPart
        ? `${mentionPart} você foi selecionado para este pedido!`
        : "Novo pedido atribuído ao supplier.",
      embeds: [
        {
          title: "📦 Pedido Atribuído",
          color: 0x5865f2,
          fields: [
            { name: "🎮 Jogo", value: input.gameTitle || "-", inline: true },
            { name: "📂 Categoria", value: input.categoryTitle || "-", inline: true },
            { name: "💰 Gold", value: `${input.goldAmount.toLocaleString("en-US")} gold`, inline: true },
            { name: "🌍 Servidor", value: input.server || "-", inline: true },
            { name: "⚔️ Facção", value: input.faction || "-", inline: true },
            { name: "👤 Personagem", value: input.nickname || "-", inline: true },
            {
              name: "🛒 Supplier",
              value: `${input.supplierName}${input.supplierDiscordHandle ? ` (${input.supplierDiscordHandle})` : ""}`,
              inline: false,
            },
            { name: "💵 Total", value: input.totalLabel || "-", inline: true },
            { name: "🆔 Order ID", value: `\`${input.orderId}\``, inline: false },
          ],
          footer: {
            text: "Use este canal privado para coordenar a entrega e o pagamento.",
          },
          timestamp: new Date().toISOString(),
        },
      ],
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