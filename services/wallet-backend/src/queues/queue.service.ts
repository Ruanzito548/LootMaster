import { Injectable } from "@nestjs/common";
import { JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";

import { DOMAIN_EVENTS } from "../events/domain-events";

@Injectable()
export class QueueService {
  private readonly connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  private readonly discordQueue = new Queue("discord-dm", { connection: this.connection });
  private readonly orderQueue = new Queue("order-events", { connection: this.connection });

  async enqueueDiscordLinkDm(payload: { discordId: string; registrationUrl: string }) {
    return this.discordQueue.add(DOMAIN_EVENTS.discordLinkRequested, payload, this.defaultJobOptions());
  }

  async enqueuePayoutDm(payload: { discordId: string; orderId: string; amount: string; currency: string }) {
    return this.discordQueue.add(DOMAIN_EVENTS.walletCredited, payload, this.defaultJobOptions());
  }

  async enqueueOrderCompleted(payload: Record<string, unknown>) {
    return this.orderQueue.add(DOMAIN_EVENTS.orderCompleted, payload, this.defaultJobOptions());
  }

  private defaultJobOptions(): JobsOptions {
    return {
      attempts: 6,
      backoff: {
        type: "exponential",
        delay: 3_000,
      },
      removeOnComplete: 500,
      removeOnFail: 2_000,
    };
  }
}