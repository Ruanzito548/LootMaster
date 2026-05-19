import { Prisma } from "@prisma/client";
export declare class AntifraudService {
    assertDiscordCanLink(tx: Prisma.TransactionClient, discordId: string, siteUserId: string): Promise<void>;
    getPayoutHoldPlan(tx: Prisma.TransactionClient, userId: string): Promise<{
        holdUntil: Date | null;
        reason: string | null;
    }>;
    assertWithdrawalAllowed(tx: Prisma.TransactionClient, userId: string, amount: Prisma.Decimal): Promise<void>;
}
