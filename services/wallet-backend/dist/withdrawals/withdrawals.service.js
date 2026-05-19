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
exports.WithdrawalsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const antifraud_service_1 = require("../antifraud/antifraud.service");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
let WithdrawalsService = class WithdrawalsService {
    prisma;
    antifraudService;
    walletService;
    auditService;
    constructor(prisma, antifraudService, walletService, auditService) {
        this.prisma = prisma;
        this.antifraudService = antifraudService;
        this.walletService = walletService;
        this.auditService = auditService;
    }
    async create(dto) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: dto.userId },
                include: { wallet: true },
            });
            if (!user?.wallet) {
                throw new common_1.ConflictException("User wallet not found.");
            }
            const amount = new client_1.Prisma.Decimal(dto.amount);
            const fee = new client_1.Prisma.Decimal(dto.fee);
            if (user.wallet.availableBalance.lessThan(amount)) {
                throw new common_1.ConflictException("Insufficient wallet balance.");
            }
            await this.antifraudService.assertWithdrawalAllowed(tx, user.id, amount);
            const request = await this.walletService.requestWithdrawal(tx, {
                walletId: user.wallet.id,
                userId: user.id,
                amount,
                fee,
                currency: this.toCurrency(dto.currency),
                payoutMethod: dto.payoutMethod,
                payoutReference: dto.payoutReference,
                metadata: {
                    payoutMethod: dto.payoutMethod,
                },
            });
            await this.auditService.log({
                actorType: client_1.AuditActorType.USER,
                actorId: user.id,
                action: "withdrawal.requested",
                entityType: "withdraw_request",
                entityId: request.id,
                metadata: {
                    amount: dto.amount,
                    fee: dto.fee,
                    payoutMethod: dto.payoutMethod,
                },
            }, tx);
            return { ok: true, withdrawRequestId: request.id };
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
exports.WithdrawalsService = WithdrawalsService;
exports.WithdrawalsService = WithdrawalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        antifraud_service_1.AntifraudService,
        wallet_service_1.WalletService,
        audit_service_1.AuditService])
], WithdrawalsService);
//# sourceMappingURL=withdrawals.service.js.map