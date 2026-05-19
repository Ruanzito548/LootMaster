import { Module } from "@nestjs/common";

import { AntifraudService } from "./antifraud/antifraud.service";
import { AuditService } from "./audit/audit.service";
import { InternalAuthGuard } from "./common/internal-auth.guard";
import { DiscordService } from "./discord/discord.service";
import { OrdersController } from "./orders/orders.controller";
import { OrdersService } from "./orders/orders.service";
import { PrismaService } from "./prisma/prisma.service";
import { QueueService } from "./queues/queue.service";
import { SupplierOnboardingController } from "./supplier-onboarding/supplier-onboarding.controller";
import { SupplierOnboardingService } from "./supplier-onboarding/supplier-onboarding.service";
import { WalletService } from "./wallet/wallet.service";
import { WithdrawalsController } from "./withdrawals/withdrawals.controller";
import { WithdrawalsService } from "./withdrawals/withdrawals.service";

@Module({
  controllers: [OrdersController, SupplierOnboardingController, WithdrawalsController],
  providers: [
    PrismaService,
    InternalAuthGuard,
    OrdersService,
    WalletService,
    SupplierOnboardingService,
    WithdrawalsService,
    AntifraudService,
    AuditService,
    DiscordService,
    QueueService,
  ],
})
export class AppModule {}