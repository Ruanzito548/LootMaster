"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const antifraud_service_1 = require("./antifraud/antifraud.service");
const audit_service_1 = require("./audit/audit.service");
const internal_auth_guard_1 = require("./common/internal-auth.guard");
const discord_service_1 = require("./discord/discord.service");
const orders_controller_1 = require("./orders/orders.controller");
const orders_service_1 = require("./orders/orders.service");
const prisma_service_1 = require("./prisma/prisma.service");
const queue_service_1 = require("./queues/queue.service");
const supplier_onboarding_controller_1 = require("./supplier-onboarding/supplier-onboarding.controller");
const supplier_onboarding_service_1 = require("./supplier-onboarding/supplier-onboarding.service");
const wallet_service_1 = require("./wallet/wallet.service");
const withdrawals_controller_1 = require("./withdrawals/withdrawals.controller");
const withdrawals_service_1 = require("./withdrawals/withdrawals.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [orders_controller_1.OrdersController, supplier_onboarding_controller_1.SupplierOnboardingController, withdrawals_controller_1.WithdrawalsController],
        providers: [
            prisma_service_1.PrismaService,
            internal_auth_guard_1.InternalAuthGuard,
            orders_service_1.OrdersService,
            wallet_service_1.WalletService,
            supplier_onboarding_service_1.SupplierOnboardingService,
            withdrawals_service_1.WithdrawalsService,
            antifraud_service_1.AntifraudService,
            audit_service_1.AuditService,
            discord_service_1.DiscordService,
            queue_service_1.QueueService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map