import { ConflictException, Injectable } from "@nestjs/common";
import { AuditActorType, CurrencyCode, Prisma } from "@prisma/client";

import { AntifraudService } from "../antifraud/antifraud.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { CreateWithdrawalRequestDto } from "./dto/create-withdrawal-request.dto";

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antifraudService: AntifraudService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateWithdrawalRequestDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
        include: { wallet: true },
      });

      if (!user?.wallet) {
        throw new ConflictException("User wallet not found.");
      }

      const amount = new Prisma.Decimal(dto.amount);
      const fee = new Prisma.Decimal(dto.fee);
      if (user.wallet.availableBalance.lessThan(amount)) {
        throw new ConflictException("Insufficient wallet balance.");
      }

      await this.antifraudService.assertWithdrawalAllowed(tx, user.id, amount);

      const request = await this.walletService.requestWithdrawal(tx, {
        walletId: user.wallet.id,
        userId: user.id,
        amount,
        fee,
        currency: this.toCurrency(dto.currency),
        payoutMethod: dto.payoutMethod,
        payoutReference: dto.payoutReference as Prisma.InputJsonValue | undefined,
        metadata: {
          payoutMethod: dto.payoutMethod,
        },
      });

      await this.auditService.log(
        {
          actorType: AuditActorType.USER,
          actorId: user.id,
          action: "withdrawal.requested",
          entityType: "withdraw_request",
          entityId: request.id,
          metadata: {
            amount: dto.amount,
            fee: dto.fee,
            payoutMethod: dto.payoutMethod,
          },
        },
        tx,
      );

      return { ok: true, withdrawRequestId: request.id };
    });
  }

  private toCurrency(value: string): CurrencyCode {
    const normalized = value.trim().toUpperCase();
    if (normalized === "BRL" || normalized === "EUR" || normalized === "GBP") {
      return normalized;
    }

    return CurrencyCode.USD;
  }
}