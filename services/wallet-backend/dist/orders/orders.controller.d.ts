import { AssignSupplierDto } from "./dto/assign-supplier.dto";
import { CompleteOrderDto } from "./dto/complete-order.dto";
import { UpsertPaidOrderDto } from "./dto/upsert-paid-order.dto";
import { OrdersService } from "./orders.service";
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    upsertPaidOrder(dto: UpsertPaidOrderDto): Promise<{
        ok: boolean;
        orderId: string;
    }>;
    assignSupplier(dto: AssignSupplierDto): Promise<{
        ok: boolean;
    }>;
    completeOrder(dto: CompleteOrderDto, idempotencyKey?: string): Promise<{
        ok: boolean;
        alreadyCompleted: boolean;
        walletCredited: boolean;
        transactionId: string;
        linkRequired?: undefined;
    } | {
        ok: boolean;
        alreadyCompleted: boolean;
        walletCredited: boolean;
        linkRequired: boolean;
        transactionId?: undefined;
    }>;
}
