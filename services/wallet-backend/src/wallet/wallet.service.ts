import { Injectable } from "@nestjs/common";
import { CurrencyCode, Prisma, WalletTransactionStatus, WalletTransactionType } from "@prisma/client";

type CreditOrderPayoutInput = {
  walletId: string;
  userId: string;
  orderId: string;
  amount: Prisma.Decimal;
  currency: CurrencyCode;
  referenceKey: string;
  metadata?: Prisma.InputJsonValue;
  holdUntil?: Date | null;
  holdReason?: string | null;
};

type RequestWithdrawalInput = {
  walletId: string;
  userId: string;
  amount: Prisma.Decimal;
  fee: Prisma.Decimal;
  currency: CurrencyCode;
  payoutMethod: string;
  payoutReference?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class WalletService {
  async creditOrderPayout(tx: Prisma.TransactionClient, input: CreditOrderPayoutInput) {
    const existing = await tx.walletTransaction.findUnique({
      where: { referenceKey: input.referenceKey },
    });

    if (existing) {
      return existing;
    }

    if (input.holdUntil) {
      await tx.wallet.update({
        where: { id: input.walletId },
        data: {
          lockedBalance: { increment: input.amount },
        },
      });

      await tx.balanceHold.create({
        data: {
          walletId: input.walletId,
          userId: input.userId,
          reason: input.holdReason ?? "manual_review",
          amount: input.amount,
          releaseAt: input.holdUntil,
        },
      });
    } else {
      await tx.wallet.update({
        where: { id: input.walletId },
        data: {
          availableBalance: { increment: input.amount },
        },
      });
    }

    return tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        userId: input.userId,
        orderId: input.orderId,
        type: WalletTransactionType.ORDER_PAYOUT,
        amount: input.amount,
        fee: new Prisma.Decimal(0),
        currency: input.currency,
        status: WalletTransactionStatus.POSTED,
        referenceKey: input.referenceKey,
        metadata: input.metadata,
        postedAt: new Date(),
      },
    });
  }

  async requestWithdrawal(tx: Prisma.TransactionClient, input: RequestWithdrawalInput) {
    await tx.wallet.update({
      where: { id: input.walletId },
      data: {
        availableBalance: { decrement: input.amount },
        lockedBalance: { increment: input.amount },
      },
    });

    const request = await tx.withdrawRequest.create({
      data: {
        walletId: input.walletId,
        userId: input.userId,
        amount: input.amount,
        fee: input.fee,
        currency: input.currency,
        payoutMethod: input.payoutMethod,
        payoutReference: input.payoutReference,
        metadata: input.metadata,
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        userId: input.userId,
        withdrawRequestId: request.id,
        type: WalletTransactionType.WITHDRAWAL_REQUEST,
        amount: input.amount.mul(-1),
        fee: input.fee,
        currency: input.currency,
        status: WalletTransactionStatus.PENDING,
        referenceKey: `withdrawal:${request.id}`,
        metadata: input.metadata,
      },
    });

    return request;
  }
}