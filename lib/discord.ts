export type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
};

type DiscordWebhookPayload = {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
};

/**
 * Posts a message to a Discord channel via an incoming webhook URL.
 *
 * @param webhookUrl - The Discord incoming webhook URL for the target channel.
 *                     Pass `null` to silently skip the notification.
 * @throws when the Discord API returns a non-2xx response
 */
export async function sendDiscordOrderNotification(
  webhookUrl: string | null | undefined,
  params: {
    applyUrl: string;
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
  },
): Promise<void> {
  if (!webhookUrl) {
    console.warn("[Discord] No webhook URL configured for this order — notification skipped.");
    return;
  }

  const amountBrl = (Number(params.finalAmountCents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: (params.currency || "BRL").toUpperCase(),
  });

  const methodLabel: Record<string, string> = {
    pix: "Pix",
    card: "Credit Card",
    balance: "LM Coins",
  };

  const fields: DiscordEmbedField[] = [
    { name: "Game", value: params.gameTitle, inline: true },
    { name: "Category", value: params.categoryTitle, inline: true },
    { name: "Gold Amount", value: `${Number(params.goldAmount).toLocaleString("en-US")} gold`, inline: true },
    { name: "Server", value: params.server || "-", inline: true },
    { name: "Faction", value: params.faction || "-", inline: true },
    { name: "Character", value: params.nickname, inline: true },
    { name: "Payment Method", value: methodLabel[params.paymentMethod] ?? params.paymentMethod, inline: true },
    { name: "Amount Paid", value: amountBrl, inline: true },
    { name: "Customer Email", value: params.email, inline: false },
    { name: "Session ID", value: `\`${params.sessionId}\``, inline: false },
  ];

  const payload: DiscordWebhookPayload = {
    username: "Loot Master",
    embeds: [
      {
        title: "Payment Confirmed",
        description: `A new paid order is ready for supplier applications.\n\n[🔔 Apply for this Order](${params.applyUrl})`,
        color: 0x39d4ff, // cyan matching the new site palette
        fields,
        footer: { text: "Loot Master - Payment Gateway" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[Discord] Webhook POST failed: ${response.status} — ${text}`);
  }
}
