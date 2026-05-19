"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntifraudService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let AntifraudService = class AntifraudService {
    async assertDiscordCanLink(tx, discordId, siteUserId) {
        const existing = await tx.user.findUnique({
            where: { discordId },
        });
        if (existing?.siteUserId && existing.siteUserId !== siteUserId) {
            throw new common_1.ConflictException("This Discord account is already linked to another site account.");
        }
    }
    async getPayoutHoldPlan(tx, userId) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.ConflictException("Supplier user not found.");
        }
        const blockedFingerprint = await tx.userAuthFingerprint.findFirst({
            where: {
                userId,
                status: client_1.FraudCheckStatus.BLOCKED,
            },
        });
        if (blockedFingerprint) {
            throw new common_1.ConflictException("Supplier account is blocked for risk review.");
        }
        const holdHours = Number(process.env.NEW_ACCOUNT_HOLD_HOURS ?? 48);
        const accountAgeMs = Date.now() - user.createdAt.getTime();
        if (accountAgeMs >= holdHours * 60 * 60 * 1000) {
            return { holdUntil: null, reason: null };
        }
        return {
            holdUntil: new Date(Date.now() + holdHours * 60 * 60 * 1000),
            reason: "new_account_cooldown",
        };
    }
    async assertWithdrawalAllowed(tx, userId, amount) {
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
            throw new common_1.ConflictException("Wallet owner not found.");
        }
        if (user.withdrawRequests.length > 0) {
            throw new common_1.ConflictException("Withdrawal cooldown still active for this account.");
        }
        const accountAgeMs = Date.now() - user.createdAt.getTime();
        if (accountAgeMs < 7 * 24 * 60 * 60 * 1000 && Number(amount) > limitForNewAccounts) {
            throw new common_1.ConflictException("New accounts cannot withdraw above the configured review limit.");
        }
    }
};
exports.AntifraudService = AntifraudService;
exports.AntifraudService = AntifraudService = __decorate([
    (0, common_1.Injectable)()
], AntifraudService);
//# sourceMappingURL=antifraud.service.js.map