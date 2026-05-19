import { Client } from "discord.js";
export declare class DiscordService {
    private readonly token;
    private readonly rest;
    private readonly client;
    sendAccountLinkDm(discordId: string, registrationUrl: string): Promise<void>;
    sendPayoutDm(discordId: string, orderId: string, amount: string, currency: string): Promise<void>;
    getBotClient(): Client<boolean>;
}
