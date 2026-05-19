import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditActorType, CurrencyCode, OrderStatus, Prisma } from "@prisma/client";

import { AntifraudService } from "../antifraud/antifraud.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queues/queue.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { AssignSupplierDto } from "./dto/assign-supplier.dto";
import { CompleteOrderDto } from "./dto/complete-order.dto";
import { UpsertPaidOrderDto } from "./dto/upsert-paid-order.dto";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly antifraudService: AntifraudService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  async upsertPaidOrder(dto: UpsertPaidOrderDto) {
    const orderMetadata = (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined;

    const order = await this.prisma.order.upsert({
      where: { externalOrderId: dto.orderId },
      update: {
        customerId: dto.customerId ?? null,
        totalAmount: new Prisma.Decimal(dto.totalAmount),
        supplierPayout: new Prisma.Decimal(dto.supplierPayout),
        currency: this.toCurrency(dto.currency),
        status: OrderStatus.PAID,
        metadata: orderMetadata,
      },
      create: {
        externalOrderId: dto.orderId,
        customerId: dto.customerId ?? null,
        totalAmount: new Prisma.Decimal(dto.totalAmount),
        supplierPayout: new Prisma.Decimal(dto.supplierPayout),
        currency: this.toCurrency(dto.currency),
        status: OrderStatus.PAID,
        metadata: orderMetadata,
      },
    });

    await this.auditService.log({
      actorType: AuditActorType.SYSTEM,
      action: "order.paid.upserted",
      entityType: "order",
      entityId: order.id,
      metadata: orderMetadata,
    });

    return { ok: true, orderId: order.id };
  }

  async assignSupplier(dto: AssignSupplierDto) {
    const order = await this.prisma.order.findUnique({
      where: { externalOrderId: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException("Order not found for supplier assignment.");
    }

    const linkedUser = await this.prisma.user.findUnique({
      where: { discordId: dto.supplierDiscordId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          assignedSupplierDiscordId: dto.supplierDiscordId,
          assignedSupplierUserId: linkedUser?.id ?? null,
          status: OrderStatus.ASSIGNED,
        },
      });

      await tx.supplierApplication.updateMany({
        where: { orderId: order.id, discordId: dto.supplierDiscordId },
        data: { accepted: true, linkedUserId: linkedUser?.id ?? null },
      });
    });

    return { ok: true };
  }

  async completeOrder(dto: CompleteOrderDto, idempotencyKey?: string) {
    const referenceKey = idempotencyKey?.trim() || `order-completed:${dto.orderId}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { externalOrderId: dto.orderId },
      });

      if (!order) {
        throw new NotFoundException("Order not found.");
      }

      const existingLedger = await tx.walletTransaction.findUnique({
        where: { referenceKey },
      });

      if (existingLedger) {
        return { ok: true, alreadyCompleted: true, walletCredited: true, transactionId: existingLedger.id };
      }

      if (!order.assignedSupplierDiscordId) {
        throw new ConflictException("No supplier was assigned to this order.");
      }

      const supplier = await tx.user.findUnique({
        where: { discordId: order.assignedSupplierDiscordId },
        include: { wallet: true },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          completedAt: new Date(),
          assignedSupplierUserId: supplier?.id ?? null,
        },
      });

      if (!supplier?.wallet) {
        await this.auditService.log(
          {
            actorType: AuditActorType.SYSTEM,
            actorId: dto.completedByUid ?? null,
            action: "order.completed.awaiting_supplier_link",
            entityType: "order",
            entityId: order.id,
            metadata: {
              externalOrderId: dto.orderId,
              assignedSupplierDiscordId: order.assignedSupplierDiscordId,
            },
          },
          tx,
        );

        await this.queueService.enqueueOrderCompleted({
          orderId: dto.orderId,
          supplierDiscordId: order.assignedSupplierDiscordId,
          linkRequired: true,
        });

        return { ok: true, alreadyCompleted: false, walletCredited: false, linkRequired: true };
      }

      const holdPlan = await this.antifraudService.getPayoutHoldPlan(tx, supplier.id);
      const ledger = await this.walletService.creditOrderPayout(tx, {
        walletId: supplier.wallet.id,
        userId: supplier.id,
        orderId: order.id,
        amount: order.supplierPayout,
        currency: order.currency,
        referenceKey,
        metadata: {
          externalOrderId: dto.orderId,
          threadId: dto.threadId ?? null,
          completedByUid: dto.completedByUid ?? null,
        },
        holdUntil: holdPlan.holdUntil,
        holdReason: holdPlan.reason,
      });

      await this.auditService.log(
        {
          actorType: AuditActorType.ADMIN,
          actorId: dto.completedByUid ?? null,
          action: "wallet.order_payout_created",
          entityType: "wallet_transaction",
          entityId: ledger.id,
          metadata: {
            externalOrderId: dto.orderId,
            holdUntil: holdPlan.holdUntil?.toISOString() ?? null,
          },
        },
        tx,
      );

      await this.queueService.enqueuePayoutDm({
        discordId: order.assignedSupplierDiscordId,
        orderId: dto.orderId,
        amount: order.supplierPayout.toString(),
        currency: order.currency,
      });

      return { ok: true, alreadyCompleted: false, walletCredited: true, transactionId: ledger.id };
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