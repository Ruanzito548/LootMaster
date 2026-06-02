import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";

import { InternalAuthGuard } from "../common/internal-auth.guard";
import { AssignSupplierDto } from "./dto/assign-supplier.dto";
import { CompleteOrderDto } from "./dto/complete-order.dto";
import { UpsertPaidOrderDto } from "./dto/upsert-paid-order.dto";
import { OrdersService } from "./orders.service";

@Controller("internal/orders")
@UseGuards(InternalAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("paid")
  async upsertPaidOrder(@Body() dto: UpsertPaidOrderDto) {
    return this.ordersService.upsertPaidOrder(dto);
  }

  @Post("assigned-supplier")
  async assignSupplier(@Body() dto: AssignSupplierDto) {
    return this.ordersService.assignSupplier(dto);
  }

  @Post("assign-supplier")
  async assignSupplierLegacy(@Body() dto: AssignSupplierDto) {
    return this.ordersService.assignSupplier(dto);
  }

  @Post("completed")
  async completeOrder(
    @Body() dto: CompleteOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.ordersService.completeOrder(dto, idempotencyKey);
  }
}