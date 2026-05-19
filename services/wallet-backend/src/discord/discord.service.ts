import { Injectable } from "@nestjs/common";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";

@Injectable()
export class DiscordService {
  private readonly token = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
  private readonly rest = new REST({ version: "10" }).setToken(this.token);
  private readonly client = new Client({ intents: [GatewayIntentBits.DirectMessages] });

  async sendAccountLinkDm(discordId: string, registrationUrl: string) {
    if (!this.token) {
      return;
    }

    const dm = (await this.rest.post(Routes.userChannels(), {
      body: { recipient_id: discordId },
    })) as { id: string };

    await this.rest.post(Routes.channelMessages(dm.id), {
      body: {
        content: `Finish your Loot Master supplier registration here: ${registrationUrl}`,
      },
    });
  }

  async sendPayoutDm(discordId: string, orderId: string, amount: string, currency: string) {
    if (!this.token) {
      return;
    }

    const dm = (await this.rest.post(Routes.userChannels(), {
      body: { recipient_id: discordId },
    })) as { id: string };

    await this.rest.post(Routes.channelMessages(dm.id), {
      body: {
        content: `You received ${amount} ${currency} for order #${orderId}. The balance is now available in your wallet.`,
      },
    });
  }

  getBotClient() {
    return this.client;
  }
}