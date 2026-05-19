"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const domain_events_1 = require("../events/domain-events");
let QueueService = class QueueService {
    connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: null,
    });
    discordQueue = new bullmq_1.Queue("discord-dm", { connection: this.connection });
    orderQueue = new bullmq_1.Queue("order-events", { connection: this.connection });
    async enqueueDiscordLinkDm(payload) {
        return this.discordQueue.add(domain_events_1.DOMAIN_EVENTS.discordLinkRequested, payload, this.defaultJobOptions());
    }
    async enqueuePayoutDm(payload) {
        return this.discordQueue.add(domain_events_1.DOMAIN_EVENTS.walletCredited, payload, this.defaultJobOptions());
    }
    async enqueueOrderCompleted(payload) {
        return this.orderQueue.add(domain_events_1.DOMAIN_EVENTS.orderCompleted, payload, this.defaultJobOptions());
    }
    defaultJobOptions() {
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
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = __decorate([
    (0, common_1.Injectable)()
], QueueService);
//# sourceMappingURL=queue.service.js.map