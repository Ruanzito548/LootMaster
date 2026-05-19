import { ConflictException, Injectable } from "@nestjs/common";
import { FraudCheckStatus, Prisma } from "@prisma/client";

@Injectable()
export class AntifraudService {
  async assertDiscordCanLink(tx: Prisma.TransactionClient, discordId: string, siteUserId: string) {
    const existing = await tx.user.findUnique({
      where: { discordId },
    });

    if (existing?.siteUserId && existing.siteUserId !== siteUserId) {
      throw new ConflictException("This Discord account is already linked to another site account.");
    }
  }

  async getPayoutHoldPlan(tx: Prisma.TransactionClient, userId: string) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ConflictException("Supplier user not found.");
    }

    const blockedFingerprint = await tx.userAuthFingerprint.findFirst({
      where: {
        userId,
        status: FraudCheckStatus.BLOCKED,
      },
    });

    if (blockedFingerprint) {
      throw new ConflictException("Supplier account is blocked for risk review.");
    }

    const holdHours = Number(process.env.NEW_ACCOUNT_HOLD_HOURS ?? 48);
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    if (accountAgeMs >= holdHours * 60 * 60 * 1000) {
      return { holdUntil: null as Date | null, reason: null as string | null };
    }

    return {
      holdUntil: new Date(Date.now() + holdHours * 60 * 60 * 1000),
      reason: "new_account_cooldown",
    };
  }

  async assertWithdrawalAllowed(tx: Prisma.TransactionClient, userId: string, amount: Prisma.Decimal) {
    const cooldownHours = Number(process.env.WITHDRAWAL_COOLDOWN_HOURS ?? 24);
    const limitForNewAccounts = Number(process.env.NEW_ACCOUNT_WITHDRAWAL_LIMIT ?? 250);

    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        withdrawRequests: {
          where: {
            requestedAt: {
              gte: new Date(Date.now() - cooldownHours * 60 * 60 * 1000),
            },
          },
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new ConflictException("Wallet owner not found.");
    }

    if (user.withdrawRequests.length > 0) {
      throw new ConflictException("Withdrawal cooldown still active for this account.");
    }

    const accountAgeMs = Date.now() - user.createdAt.getTime();
    if (accountAgeMs < 7 * 24 * 60 * 60 * 1000 && Number(amount) > limitForNewAccounts) {
      throw new ConflictException("New accounts cannot withdraw above the configured review limit.");
    }
  }
}