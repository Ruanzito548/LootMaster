"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const antifraud_service_1 = require("../antifraud/antifraud.service");
const audit_service_1 = require("../audit/audit.service");
const queue_service_1 = require("../queues/queue.service");
const prisma_service_1 = require("../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
let OrdersService = class OrdersService {
    prisma;
    walletService;
    antifraudService;
    auditService;
    queueService;
    constructor(prisma, walletService, antifraudService, auditService, queueService) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.antifraudService = antifraudService;
        this.auditService = auditService;
        this.queueService = queueService;
    }
    async upsertPaidOrder(dto) {
        const orderMetadata = (dto.metadata ?? undefined);
        const order = await this.prisma.order.upsert({
            where: { externalOrderId: dto.orderId },
            update: {
                customerId: dto.customerId ?? null,
                totalAmount: new client_1.Prisma.Decimal(dto.totalAmount),
                supplierPayout: new client_1.Prisma.Decimal(dto.supplierPayout),
                currency: this.toCurrency(dto.currency),
                status: client_1.OrderStatus.PAID,
                metadata: orderMetadata,
            },
            create: {
                externalOrderId: dto.orderId,
                customerId: dto.customerId ?? null,
                totalAmount: new client_1.Prisma.Decimal(dto.totalAmount),
                supplierPayout: new client_1.Prisma.Decimal(dto.supplierPayout),
                currency: this.toCurrency(dto.currency),
                status: client_1.OrderStatus.PAID,
                metadata: orderMetadata,
            },
        });
        await this.auditService.log({
            actorType: client_1.AuditActorType.SYSTEM,
            action: "order.paid.upserted",
            entityType: "order",
            entityId: order.id,
            metadata: orderMetadata,
        });
        return { ok: true, orderId: order.id };
    }
    async assignSupplier(dto) {
        const order = await this.prisma.order.findUnique({
            where: { externalOrderId: dto.orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException("Order not found for supplier assignment.");
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
                    status: client_1.OrderStatus.ASSIGNED,
                },
            });
            await tx.supplierApplication.updateMany({
                where: { orderId: order.id, discordId: dto.supplierDiscordId },
                data: { accepted: true, linkedUserId: linkedUser?.id ?? null },
            });
        });
        return { ok: true };
    }
    async completeOrder(dto, idempotencyKey) {
        const referenceKey = idempotencyKey?.trim() || `order-completed:${dto.orderId}`;
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { externalOrderId: dto.orderId },
            });
            if (!order) {
                throw new common_1.NotFoundException("Order not found.");
            }
            const existingLedger = await tx.walletTransaction.findUnique({
                where: { referenceKey },
            });
            if (existingLedger) {
                return { ok: true, alreadyCompleted: true, walletCredited: true, transactionId: existingLedger.id };
            }
            if (!order.assignedSupplierDiscordId) {
                throw new common_1.ConflictException("No supplier was assigned to this order.");
            }
            const supplier = await tx.user.findUnique({
                where: { discordId: order.assignedSupplierDiscordId },
                include: { wallet: true },
            });
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.COMPLETED,
                    completedAt: new Date(),
                    assignedSupplierUserId: supplier?.id ?? null,
                },
            });
            if (!supplier?.wallet) {
                await this.auditService.log({
                    actorType: client_1.AuditActorType.SYSTEM,
                    actorId: dto.completedByUid ?? null,
                    action: "order.completed.awaiting_supplier_link",
                    entityType: "order",
                    entityId: order.id,
                    metadata: {
                        externalOrderId: dto.orderId,
                        assignedSupplierDiscordId: order.assignedSupplierDiscordId,
                    },
                }, tx);
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
            await this.auditService.log({
                actorType: client_1.AuditActorType.ADMIN,
                actorId: dto.completedByUid ?? null,
                action: "wallet.order_payout_created",
                entityType: "wallet_transaction",
                entityId: ledger.id,
                metadata: {
                    externalOrderId: dto.orderId,
                    holdUntil: holdPlan.holdUntil?.toISOString() ?? null,
                },
            }, tx);
            await this.queueService.enqueuePayoutDm({
                discordId: order.assignedSupplierDiscordId,
                orderId: dto.orderId,
                amount: order.supplierPayout.toString(),
                currency: order.currency,
            });
            return { ok: true, alreadyCompleted: false, walletCredited: true, transactionId: ledger.id };
        });
    }
    toCurrency(value) {
        const normalized = value.trim().toUpperCase();
        if (normalized === "BRL" || normalized === "EUR" || normalized === "GBP") {
            return normalized;
        }
        return client_1.CurrencyCode.USD;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        antifraud_service_1.AntifraudService,
        audit_service_1.AuditService,
        queue_service_1.QueueService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map