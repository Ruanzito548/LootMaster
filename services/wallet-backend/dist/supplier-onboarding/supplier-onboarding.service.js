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
exports.SupplierOnboardingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const antifraud_service_1 = require("../antifraud/antifraud.service");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../prisma/prisma.service");
const queue_service_1 = require("../queues/queue.service");
let SupplierOnboardingService = class SupplierOnboardingService {
    prisma;
    antifraudService;
    auditService;
    queueService;
    constructor(prisma, antifraudService, auditService, queueService) {
        this.prisma = prisma;
        this.antifraudService = antifraudService;
        this.auditService = auditService;
        this.queueService = queueService;
    }
    async registerApplication(dto) {
        const siteUrl = (process.env.APP_URL ?? "https://site.com").replace(/\/$/, "");
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.upsert({
                where: { externalOrderId: dto.orderId },
                update: {},
                create: {
                    externalOrderId: dto.orderId,
                    totalAmount: new client_1.Prisma.Decimal(0),
                    supplierPayout: new client_1.Prisma.Decimal(0),
                    currency: client_1.CurrencyCode.USD,
                    status: client_1.OrderStatus.CREATED,
                },
            });
            const linkedUser = await tx.user.findUnique({
                where: { discordId: dto.discordId },
            });
            await tx.supplierApplication.upsert({
                where: {
                    orderId_discordId: {
                        orderId: order.id,
                        discordId: dto.discordId,
                    },
                },
                update: {
                    discordUsername: dto.discordUsername,
                    linkedUserId: linkedUser?.id ?? null,
                    appliedAt: new Date(),
                },
                create: {
                    orderId: order.id,
                    discordId: dto.discordId,
                    discordUsername: dto.discordUsername,
                    linkedUserId: linkedUser?.id ?? null,
                },
            });
            if (linkedUser) {
                return {
                    linkRequired: false,
                    registrationUrl: null,
                    dmQueued: false,
                };
            }
            const token = (0, node_crypto_1.randomUUID)();
            const registrationUrl = `${siteUrl}/cadastro?token=${encodeURIComponent(token)}`;
            await tx.discordLinkToken.create({
                data: {
                    discordId: dto.discordId,
                    token,
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                },
            });
            await this.auditService.log({
                actorType: client_1.AuditActorType.DISCORD_BOT,
                actorId: dto.discordId,
                action: "discord.link_token.created",
                entityType: "discord_link_token",
                entityId: token,
                metadata: {
                    externalOrderId: dto.orderId,
                },
            }, tx);
            await this.queueService.enqueueDiscordLinkDm({
                discordId: dto.discordId,
                registrationUrl,
            });
            return {
                linkRequired: true,
                registrationUrl,
                dmQueued: true,
            };
        });
    }
    async consumeLinkToken(dto) {
        return this.prisma.$transaction(async (tx) => {
            const token = await tx.discordLinkToken.findUnique({
                where: { token: dto.token },
            });
            if (!token || token.usedAt || token.expiresAt < new Date()) {
                throw new common_1.NotFoundException("Link token is invalid or expired.");
            }
            await this.antifraudService.assertDiscordCanLink(tx, token.discordId, dto.siteUserId);
            const existingUser = await tx.user.findUnique({
                where: { discordId: token.discordId },
                include: { wallet: true },
            });
            const user = existingUser
                ? await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        siteUserId: dto.siteUserId,
                        discordUsername: dto.discordUsername,
                        email: dto.email ?? existingUser.email,
                    },
                    include: { wallet: true },
                })
                : await tx.user.create({
                    data: {
                        siteUserId: dto.siteUserId,
                        discordId: token.discordId,
                        discordUsername: dto.discordUsername,
                        email: dto.email ?? null,
                        wallet: {
                            create: {
                                currency: this.defaultCurrency(),
                            },
                        },
                    },
                    include: { wallet: true },
                });
            if (!user.wallet) {
                throw new common_1.ConflictException("Linked user must have a wallet.");
            }
            if (existingUser && !existingUser.wallet) {
                await tx.wallet.create({
                    data: {
                        userId: user.id,
                        currency: this.defaultCurrency(),
                    },
                });
            }
            await tx.discordLinkToken.update({
                where: { id: token.id },
                data: {
                    usedAt: new Date(),
                    linkedUserId: user.id,
                },
            });
            await tx.user.update({
                where: { id: user.id },
                data: {
                    walletId: user.wallet.id,
                },
            });
            await tx.supplierApplication.updateMany({
                where: { discordId: token.discordId },
                data: { linkedUserId: user.id },
            });
            await tx.order.updateMany({
                where: { assignedSupplierDiscordId: token.discordId },
                data: { assignedSupplierUserId: user.id },
            });
            await this.auditService.log({
                actorType: client_1.AuditActorType.USER,
                actorId: user.id,
                action: "discord.link_token.consumed",
                entityType: "user",
                entityId: user.id,
                metadata: {
                    discordId: token.discordId,
                },
            }, tx);
            return { linked: true, userId: user.id, walletId: user.wallet.id };
        });
    }
    defaultCurrency() {
        const configured = (process.env.DEFAULT_WALLET_CURRENCY ?? "USD").trim().toUpperCase();
        if (configured === "BRL" || configured === "EUR" || configured === "GBP") {
            return configured;
        }
        return client_1.CurrencyCode.USD;
    }
};
exports.SupplierOnboardingService = SupplierOnboardingService;
exports.SupplierOnboardingService = SupplierOnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        antifraud_service_1.AntifraudService,
        audit_service_1.AuditService,
        queue_service_1.QueueService])
], SupplierOnboardingService);
//# sourceMappingURL=supplier-onboarding.service.js.map