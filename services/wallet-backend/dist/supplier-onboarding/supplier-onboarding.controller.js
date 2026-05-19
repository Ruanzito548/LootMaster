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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierOnboardingController = void 0;
const common_1 = require("@nestjs/common");
const internal_auth_guard_1 = require("../common/internal-auth.guard");
const consume_discord_link_token_dto_1 = require("./dto/consume-discord-link-token.dto");
const register_supplier_application_dto_1 = require("./dto/register-supplier-application.dto");
const supplier_onboarding_service_1 = require("./supplier-onboarding.service");
let SupplierOnboardingController = class SupplierOnboardingController {
    onboardingService;
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    async registerApplication(dto) {
        return this.onboardingService.registerApplication(dto);
    }
    async consumeLinkToken(dto) {
        return this.onboardingService.consumeLinkToken(dto);
    }
};
exports.SupplierOnboardingController = SupplierOnboardingController;
__decorate([
    (0, common_1.Post)("discord/applications"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_supplier_application_dto_1.RegisterSupplierApplicationDto]),
    __metadata("design:returntype", Promise)
], SupplierOnboardingController.prototype, "registerApplication", null);
__decorate([
    (0, common_1.Post)("discord-link/consume"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [consume_discord_link_token_dto_1.ConsumeDiscordLinkTokenDto]),
    __metadata("design:returntype", Promise)
], SupplierOnboardingController.prototype, "consumeLinkToken", null);
exports.SupplierOnboardingController = SupplierOnboardingController = __decorate([
    (0, common_1.Controller)("internal"),
    (0, common_1.UseGuards)(internal_auth_guard_1.InternalAuthGuard),
    __metadata("design:paramtypes", [supplier_onboarding_service_1.SupplierOnboardingService])
], SupplierOnboardingController);
//# sourceMappingURL=supplier-onboarding.controller.js.map