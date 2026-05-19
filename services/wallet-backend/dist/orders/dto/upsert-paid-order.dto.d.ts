export declare class UpsertPaidOrderDto {
    orderId: string;
    customerId?: string | null;
    totalAmount: number;
    supplierPayout: number;
    currency: string;
    metadata?: Record<string, unknown>;
}
