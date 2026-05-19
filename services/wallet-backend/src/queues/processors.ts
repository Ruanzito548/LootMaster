import "reflect-metadata";

import { Job, Worker } from "bullmq";

import { DiscordService } from "../discord/discord.service";
import { DOMAIN_EVENTS } from "../events/domain-events";

const discordService = new DiscordService();
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

async function handleDiscordJob(job: Job) {
  if (job.name === DOMAIN_EVENTS.discordLinkRequested) {
    const data = job.data as { discordId: string; registrationUrl: string };
    await discordService.sendAccountLinkDm(data.discordId, data.registrationUrl);
    return;
  }

  if (job.name === DOMAIN_EVENTS.walletCredited) {
    const data = job.data as { discordId: string; orderId: string; amount: string; currency: string };
    await discordService.sendPayoutDm(data.discordId, data.orderId, data.amount, data.currency);
  }
}

new Worker("discord-dm", handleDiscordJob, { connection });