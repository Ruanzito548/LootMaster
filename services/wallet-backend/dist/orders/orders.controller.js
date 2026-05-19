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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const internal_auth_guard_1 = require("../common/internal-auth.guard");
const assign_supplier_dto_1 = require("./dto/assign-supplier.dto");
const complete_order_dto_1 = require("./dto/complete-order.dto");
const upsert_paid_order_dto_1 = require("./dto/upsert-paid-order.dto");
const orders_service_1 = require("./orders.service");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async upsertPaidOrder(dto) {
        return this.ordersService.upsertPaidOrder(dto);
    }
    async assignSupplier(dto) {
        return this.ordersService.assignSupplier(dto);
    }
    async completeOrder(dto, idempotencyKey) {
        return this.ordersService.completeOrder(dto, idempotencyKey);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)("paid"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_paid_order_dto_1.UpsertPaidOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "upsertPaidOrder", null);
__decorate([
    (0, common_1.Post)("assigned-supplier"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assign_supplier_dto_1.AssignSupplierDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "assignSupplier", null);
__decorate([
    (0, common_1.Post)("completed"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [complete_order_dto_1.CompleteOrderDto, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "completeOrder", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)("internal/orders"),
    (0, common_1.UseGuards)(internal_auth_guard_1.InternalAuthGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map