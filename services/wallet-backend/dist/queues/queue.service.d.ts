export declare class QueueService {
    private readonly connection;
    private readonly discordQueue;
    private readonly orderQueue;
    enqueueDiscordLinkDm(payload: {
        discordId: string;
        registrationUrl: string;
    }): Promise<import("bullmq").Job<any, any, string>>;
    enqueuePayoutDm(payload: {
        discordId: string;
        orderId: string;
        amount: string;
        currency: string;
    }): Promise<import("bullmq").Job<any, any, string>>;
    enqueueOrderCompleted(payload: Record<string, unknown>): Promise<import("bullmq").Job<any, any, string>>;
    private defaultJobOptions;
}
