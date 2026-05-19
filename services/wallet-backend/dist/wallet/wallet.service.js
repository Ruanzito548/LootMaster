"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let WalletService = class WalletService {
    async creditOrderPayout(tx, input) {
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
        }
        else {
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
                type: client_1.WalletTransactionType.ORDER_PAYOUT,
                amount: input.amount,
                fee: new client_1.Prisma.Decimal(0),
                currency: input.currency,
                status: client_1.WalletTransactionStatus.POSTED,
                referenceKey: input.referenceKey,
                metadata: input.metadata,
                postedAt: new Date(),
            },
        });
    }
    async requestWithdrawal(tx, input) {
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
                type: client_1.WalletTransactionType.WITHDRAWAL_REQUEST,
                amount: input.amount.mul(-1),
                fee: input.fee,
                currency: input.currency,
                status: client_1.WalletTransactionStatus.PENDING,
                referenceKey: `withdrawal:${request.id}`,
                metadata: input.metadata,
            },
        });
        return request;
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)()
], WalletService);
//# sourceMappingURL=wallet.service.js.map