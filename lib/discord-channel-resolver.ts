/**
 * Resolves the Discord channel ID used to post an order notification for a given
 * game+category pair.
 *
 * Priority:
 *   1) DISCORD_CHANNEL_* env vars (direct channel IDs)
 *   2) Legacy DISCORD_WEBHOOK_* env vars (resolved to channel_id via the Discord API)
 */

function parseDiscordWebhookUrl(webhookUrl: string): { webhookId: string; webhookToken: string } | null {
  try {
    const parsed = new URL(webhookUrl);
    const [, , resource, webhookId, webhookToken] = parsed.pathname.split("/");
    if (resource !== "webhooks" || !webhookId || !webhookToken) return null;
    return { webhookId, webhookToken };
  } catch {
    return null;
  }
}

const channelIdCache = new Map<string, string>();

export async function resolveDiscordChannelId(gameId: string, categoryId: string): Promise<string | null> {
  const key = `${gameId}::${categoryId}`;
  const channelMap: Record<string, string | undefined> = {
    "tbc-anniversary::gold": process.env.DISCORD_CHANNEL_WOW_TBC_GOLD,
    "retail::gold": process.env.DISCORD_CHANNEL_WOW_RETAIL_GOLD,
    "classic-era::gold": process.env.DISCORD_CHANNEL_WOW_CLASSIC_GOLD,
    "mist-of-pandaria::gold": process.env.DISCORD_CHANNEL_WOW_PANDARIA_GOLD,
  };
  const explicitChannelId = channelMap[key] ?? process.env.DISCORD_CHANNEL_DEFAULT ?? null;
  if (explicitChannelId) {
    return explicitChannelId;
  }

  const webhookMap: Record<string, string | undefined> = {
    "tbc-anniversary::gold": process.env.DISCORD_WEBHOOK_WOW_TBC_GOLD,
    "retail::gold": process.env.DISCORD_WEBHOOK_WOW_RETAIL_GOLD,
    "classic-era::gold": process.env.DISCORD_WEBHOOK_WOW_CLASSIC_GOLD,
    "mist-of-pandaria::gold": process.env.DISCORD_WEBHOOK_WOW_PANDARIA_GOLD,
  };

  const webhookUrl = webhookMap[key] ?? process.env.DISCORD_WEBHOOK_DEFAULT ?? null;
  if (!webhookUrl) {
    return null;
  }

  const cachedChannelId = channelIdCache.get(webhookUrl);
  if (cachedChannelId) {
    return cachedChannelId;
  }

  const webhookIdentity = parseDiscordWebhookUrl(webhookUrl);
  if (!webhookIdentity) {
    console.warn("[Discord Channel Resolver] Invalid Discord webhook URL format. Could not resolve channel ID.");
    return null;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${webhookIdentity.webhookId}/${webhookIdentity.webhookToken}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[Discord Channel Resolver] Failed to resolve channel from webhook: ${response.status} - ${text}`);
      return null;
    }

    const payload = (await response.json()) as { channel_id?: string };
    if (!payload.channel_id) {
      console.warn("[Discord Channel Resolver] Webhook payload does not contain channel_id.");
      return null;
    }

    channelIdCache.set(webhookUrl, payload.channel_id);
    return payload.channel_id;
  } catch (error) {
    console.warn("[Discord Channel Resolver] Error resolving channel from webhook.", error);
    return null;
  }
}
