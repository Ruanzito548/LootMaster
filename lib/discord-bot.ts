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
  payoutLabel: string;
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

type DiscordCurrentUserResponse = {
  id: string;
};

class DiscordApiError extends Error {
  status: number;
  path: string;
  responseBody: string;

  constructor(path: string, status: number, responseBody: string) {
    super(`Discord API request failed: ${status} (${path}) - ${responseBody}`);
    this.name = "DiscordApiError";
    this.status = status;
    this.path = path;
    this.responseBody = responseBody;
  }
}

function isDiscordApiError(error: unknown): error is DiscordApiError {
  return error instanceof DiscordApiError;
}

let cachedBotUserId: string | null = null;

async function getBotUserId(): Promise<string> {
  if (cachedBotUserId) {
    return cachedBotUserId;
  }

  const response = await discordRequest("/users/@me", {
    method: "GET",
  });

  const user = (await response.json()) as DiscordCurrentUserResponse;

  if (!user.id) {
    throw new Error("Could not resolve Discord bot user ID.");
  }

  cachedBotUserId = user.id;
  return user.id;
}

async function sendSupplierIntroMessage(channelId: string, input: CreatePrivateSupplierThreadInput) {
  const mentionPart = input.supplierDiscordUserId?.trim()
    ? `<@${input.supplierDiscordUserId.trim()}>`
    : null;

  await discordRequest(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: mentionPart
        ? `${mentionPart} you were selected for this order!`
        : "A supplier has been assigned to this order.",
      embeds: [
        {
          title: "Assigned Order",
          color: 0x5865f2,
          fields: [
            { name: "Game", value: input.gameTitle || "-", inline: true },
            { name: "Category", value: input.categoryTitle || "-", inline: true },
            { name: "Gold", value: `${input.goldAmount.toLocaleString("en-US")} gold`, inline: true },
            { name: "Server", value: input.server || "-", inline: true },
            { name: "Faction", value: input.faction || "-", inline: true },
            { name: "Character", value: input.nickname || "-", inline: true },
            {
              name: "Supplier",
              value: `${input.supplierName}${input.supplierDiscordHandle ? ` (${input.supplierDiscordHandle})` : ""}`,
              inline: false,
            },
            { name: "Supplier Payout", value: input.payoutLabel || "-", inline: true },
            { name: "Order ID", value: `\`${input.orderId}\``, inline: false },
          ],
          footer: {
            text: "Use this private space to coordinate delivery and payout.",
          },
        },
      ],
    }),
  });
}

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
    throw new DiscordApiError(path, response.status, text);
  }

  return response;
}

export async function createPrivateSupplierThread(
  input: CreatePrivateSupplierThreadInput,
): Promise<{ threadId: string; threadUrl: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const fallbackParentChannelId = process.env.DISCORD_SUPPLIER_THREAD_CHANNEL_ID;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured.");
  }

  const orderSuffix = input.orderId.slice(-8).toLowerCase();
  const preferredName = `💵-order-${orderSuffix}`;
  const safeChannelName = `order-${orderSuffix}`;

  const botUserId = await getBotUserId();

  // @everyone cannot see; supplier can see + send messages
  const permissionOverwrites: object[] = [
    { id: guildId, type: 0, deny: "1024" }, // deny VIEW_CHANNEL for @everyone
    { id: botUserId, type: 1, allow: "3072" }, // allow bot VIEW_CHANNEL + SEND_MESSAGES
  ];

  if (input.supplierDiscordUserId?.trim()) {
    permissionOverwrites.push({
      id: input.supplierDiscordUserId.trim(),
      type: 1, // member
      allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
    });
  }

  const categoryId = process.env.DISCORD_SUPPLIER_CATEGORY_ID;

  let createdChannelId: string | null = null;

  try {
    try {
      const createResponse = await discordRequest(`/guilds/${guildId}/channels`, {
        method: "POST",
        body: JSON.stringify({
          name: preferredName,
          type: 0, // GUILD_TEXT
          permission_overwrites: permissionOverwrites,
          ...(categoryId ? { parent_id: categoryId } : {}),
        }),
      });

      const channel = (await createResponse.json()) as { id: string };
      createdChannelId = channel.id;
    } catch (error) {
      const isInvalidNameForGuildChannel =
        error instanceof DiscordApiError && error.status === 400;

      if (!isInvalidNameForGuildChannel) {
        throw error;
      }

      const createResponse = await discordRequest(`/guilds/${guildId}/channels`, {
        method: "POST",
        body: JSON.stringify({
          name: safeChannelName,
          type: 0, // GUILD_TEXT
          permission_overwrites: permissionOverwrites,
          ...(categoryId ? { parent_id: categoryId } : {}),
        }),
      });

      const channel = (await createResponse.json()) as { id: string };
      createdChannelId = channel.id;
    }
  } catch (error) {
    const canFallbackToThread =
      error instanceof DiscordApiError &&
      error.status === 403 &&
      Boolean(fallbackParentChannelId?.trim());

    if (!canFallbackToThread) {
      if (error instanceof DiscordApiError && error.status === 403) {
        throw new Error(
          "Discord returned Missing Access while creating the private channel. Verify the bot has Manage Channels permission and DISCORD_GUILD_ID is correct.",
        );
      }

      throw error;
    }

    const createThreadResponse = await discordRequest(`/channels/${fallbackParentChannelId?.trim()}/threads`, {
      method: "POST",
      body: JSON.stringify({
        name: preferredName,
        auto_archive_duration: 1440,
        type: 12,
        invitable: false,
      }),
    });

    const thread = (await createThreadResponse.json()) as DiscordThreadResponse;

    if (input.supplierDiscordUserId?.trim()) {
      await discordRequest(`/channels/${thread.id}/thread-members/${input.supplierDiscordUserId.trim()}`, {
        method: "PUT",
        body: JSON.stringify({}),
      });
    }

    await sendSupplierIntroMessage(thread.id, input);

    return {
      threadId: thread.id,
      threadUrl: `https://discord.com/channels/${guildId}/${thread.id}`,
    };
  }

  if (!createdChannelId) {
    throw new Error("Could not resolve the created Discord channel.");
  }

  await sendSupplierIntroMessage(createdChannelId, input);

  return {
    threadId: createdChannelId,
    threadUrl: `https://discord.com/channels/${guildId}/${createdChannelId}`,
  };
}

export async function sendOrderNotificationViaBot(input: SendOrderNotificationInput): Promise<void> {
  if (!input.channelId) {
    console.warn("[Discord Bot] No channel ID configured for this order - notification skipped.");
    return;
  }

  const supplierPayoutCents = Math.round(Number(input.finalAmountCents) * 0.85);
  const supplierPayoutLabel = (supplierPayoutCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const fields = [
    { name: "Game", value: input.gameTitle || "-", inline: true },
    { name: "Category", value: input.categoryTitle || "-", inline: true },
    { name: "Gold Amount", value: `${Number(input.goldAmount || "0").toLocaleString("en-US")} gold`, inline: true },
    { name: "Server", value: input.server || "-", inline: true },
    { name: "Faction", value: input.faction || "-", inline: true },
    { name: "Supplier Payout", value: supplierPayoutLabel, inline: true },
  ];

  await discordRequest(`/channels/${input.channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      embeds: [
        {
          title: "🚀 NEW ORDER",
          color: 0x39d4ff,
          fields,
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "Apply",
              custom_id: `apply_order:${input.sessionId}`,
            },
          ],
        },
      ],
    }),
  });
}

export async function deleteSupplierChannel(channelId: string): Promise<void> {
  const id = channelId.trim();

  if (!id) {
    throw new Error("Missing Discord channel ID.");
  }

  try {
    await discordRequest(`/channels/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (isDiscordApiError(error) && error.status === 404) {
      // Already deleted or not found: treat as completed action.
      return;
    }

    if (isDiscordApiError(error) && error.status === 403) {
      throw new Error("Discord returned Missing Access while deleting the supplier channel.");
    }

    throw error;
  }
}