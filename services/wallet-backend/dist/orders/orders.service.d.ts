import { AntifraudService } from "../antifraud/antifraud.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queues/queue.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { AssignSupplierDto } from "./dto/assign-supplier.dto";
import { CompleteOrderDto } from "./dto/complete-order.dto";
import { UpsertPaidOrderDto } from "./dto/upsert-paid-order.dto";
export declare class OrdersService {
    private readonly prisma;
    private readonly walletService;
    private readonly antifraudService;
    private readonly auditService;
    private readonly queueService;
    constructor(prisma: PrismaService, walletService: WalletService, antifraudService: AntifraudService, auditService: AuditService, queueService: QueueService);
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
    private toCurrency;
}
