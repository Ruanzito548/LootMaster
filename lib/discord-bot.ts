import { getServersByGameId } from "../app/data/games";

type CreatePrivateSupplierThreadInput = {
  orderId: string;
  supplierName: string;
  supplierDiscordUserId?: string;
  supplierDiscordHandle: string;
  gameId?: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: number;
  serverId?: string;
  server: string;
  faction: string;
  nickname: string;
  totalLabel: string;
  payoutLabel: string;
};

type SendOrderNotificationInput = {
  gameId?: string;
  channelId: string | null | undefined;
  sessionId: string;
  gameTitle: string;
  categoryTitle: string;
  goldAmount: string;
  serverId?: string;
  server: string;
  faction: string;
  nickname: string;
  paymentMethod: string;
  finalAmountCents?: string;
  supplierPayoutCents?: string;
  currency: string;
  email: string;
};

const CANONICAL_GAME_TITLES: Record<string, string> = {
  retail: "World of Warcraft Midnight",
  "classic-era": "World of Warcraft Classic Era",
  "tbc-anniversary": "World of Warcraft TBC Anniversary",
  "mist-of-pandaria": "World of Warcraft Mist of Pandaria",
};

export function normalizeDiscordOrderMetadata(input: {
  gameId?: string;
  gameTitle?: string;
  serverId?: string;
  server?: string;
}): { gameTitle: string; server: string } {
  const gameId = input.gameId?.trim() ?? "";
  const serverId = input.serverId?.trim() ?? "";
  const rawGameTitle = input.gameTitle?.trim() ?? "";
  const rawServerName = input.server?.trim() ?? "";

  const canonicalGameTitle = gameId ? CANONICAL_GAME_TITLES[gameId] ?? rawGameTitle : rawGameTitle;

  let resolvedServer = rawServerName;
  if (!resolvedServer && serverId) {
    const knownServers = getServersByGameId(gameId);
    resolvedServer = knownServers.find((server) => server.id === serverId)?.name ?? "";
  }

  return {
    gameTitle: canonicalGameTitle || rawGameTitle || "—",
    server: resolvedServer || rawServerName || "—",
  };
}

type SendSupplierPayoutMessageInput = {
  channelId: string;
  orderId: string;
  payoutLootCoins: number;
  supplierDiscordUserId?: string | null;
  profileUrl?: string | null;
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
  const normalized = normalizeDiscordOrderMetadata({
    gameId: input.gameId,
    gameTitle: input.gameTitle,
    serverId: input.serverId,
    server: input.server,
  });

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
            { name: "Game", value: normalized.gameTitle || "-", inline: true },
            { name: "Category", value: input.categoryTitle || "-", inline: true },
            { name: "Gold", value: `${input.goldAmount.toLocaleString("en-US")} gold`, inline: true },
            { name: "Server", value: normalized.server || "-", inline: true },
            { name: "Faction", value: input.faction || "-", inline: true },
            { name: "Character", value: input.nickname || "-", inline: true },
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

  await discordRequest(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content:
        "Please send a video showing the gold delivery to Support@lootmaster.gg after completing this order.",
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

export type OrderNotificationMessageRef = {
  channelId: string;
  messageId: string;
};

export async function sendOrderNotificationViaBot(
  input: SendOrderNotificationInput,
): Promise<OrderNotificationMessageRef | null> {
  if (!input.channelId) {
    console.warn("[Discord Bot] No channel ID configured for this order - notification skipped.");
    return null;
  }

  const payoutFromOrderCents =
    typeof input.supplierPayoutCents === "string" && input.supplierPayoutCents.trim().length > 0
      ? Number(input.supplierPayoutCents)
      : 0;
  const supplierPayoutCents = Number.isFinite(payoutFromOrderCents) ? Math.max(0, payoutFromOrderCents) : 0;
  const payoutUsdCents = supplierPayoutCents;
  const normalized = normalizeDiscordOrderMetadata({
    gameId: input.gameId,
    gameTitle: input.gameTitle,
    serverId: input.serverId,
    server: input.server,
  });

  const supplierPayoutLabel = (payoutUsdCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const fields = [
    { name: "Game", value: normalized.gameTitle || "-", inline: true },
    { name: "Category", value: input.categoryTitle || "-", inline: true },
    { name: "Gold Amount", value: `${Number(input.goldAmount || "0").toLocaleString("en-US")} gold`, inline: true },
    { name: "Server", value: normalized.server || "-", inline: true },
    { name: "Faction", value: input.faction || "-", inline: true },
    { name: "Supplier Payout", value: supplierPayoutLabel, inline: true },
  ];

  const response = await discordRequest(`/channels/${input.channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "@everyone",
      allowed_mentions: {
        parse: ["everyone"],
      },
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

  const message = (await response.json()) as { id?: string };

  if (!message?.id) {
    return null;
  }

  return { channelId: input.channelId, messageId: message.id };
}

export async function markOrderNotificationCompleted(input: OrderNotificationMessageRef): Promise<void> {
  const channelId = input.channelId.trim();
  const messageId = input.messageId.trim();

  if (!channelId || !messageId) {
    return;
  }

  try {
    const current = await discordRequest(`/channels/${channelId}/messages/${messageId}`, {
      method: "GET",
    });

    const message = (await current.json()) as {
      embeds?: Array<Record<string, unknown>>;
    };

    const originalEmbed = message.embeds?.[0] ?? {};
    const originalFields = Array.isArray(originalEmbed.fields)
      ? (originalEmbed.fields as Array<{ name?: string; value?: string; inline?: boolean }>)
      : [];

    const completedEmbed = {
      ...originalEmbed,
      title: "~~🚀 NEW ORDER~~",
      color: 0x57f287,
      fields: originalFields.map((field) => ({
        name: field.name ?? "-",
        value: `~~${(field.value ?? "-").replace(/~~/g, "")}~~`,
        inline: field.inline ?? false,
      })),
      footer: { text: "Order completed ✅" },
    };

    await discordRequest(`/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [completedEmbed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3,
                label: "Order Completed ✅",
                custom_id: "order_completed",
                disabled: true,
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    if (isDiscordApiError(error) && error.status === 404) {
      // Original order message was deleted: nothing to update.
      return;
    }

    throw error;
  }
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

export async function sendSupplierPayoutMessage(input: SendSupplierPayoutMessageInput): Promise<void> {
  const channelId = input.channelId.trim();

  if (!channelId) {
    throw new Error("Missing Discord channel ID.");
  }

  const mention = input.supplierDiscordUserId?.trim()
    ? `<@${input.supplierDiscordUserId.trim()}> `
    : "";

  const payoutLabel = input.payoutLootCoins.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  await discordRequest(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `${mention}Order completed. Your Loot Coins payout has been credited.`,
      embeds: [
        {
          title: "Payout Sent",
          color: 0x2ecc71,
          fields: [
            { name: "Order ID", value: `\`${input.orderId}\``, inline: false },
            { name: "Loot Coins credited", value: payoutLabel, inline: true },
            {
              name: "Check your profile",
              value: input.profileUrl?.trim() || "Open your profile in the site menu.",
              inline: false,
            },
          ],
        },
      ],
    }),
  });
}