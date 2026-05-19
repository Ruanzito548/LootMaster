"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const bullmq_1 = require("bullmq");
const discord_service_1 = require("../discord/discord.service");
const domain_events_1 = require("../events/domain-events");
const discordService = new discord_service_1.DiscordService();
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
async function handleDiscordJob(job) {
    if (job.name === domain_events_1.DOMAIN_EVENTS.discordLinkRequested) {
        const data = job.data;
        await discordService.sendAccountLinkDm(data.discordId, data.registrationUrl);
        return;
    }
    if (job.name === domain_events_1.DOMAIN_EVENTS.walletCredited) {
        const data = job.data;
        await discordService.sendPayoutDm(data.discordId, data.orderId, data.amount, data.currency);
    }
}
new bullmq_1.Worker("discord-dm", handleDiscordJob, { connection });
//# sourceMappingURL=processors.js.map