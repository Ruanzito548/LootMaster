import { CurrencyCode, Prisma } from "@prisma/client";
type CreditOrderPayoutInput = {
    walletId: string;
    userId: string;
    orderId: string;
    amount: Prisma.Decimal;
    currency: CurrencyCode;
    referenceKey: string;
    metadata?: Prisma.InputJsonValue;
    holdUntil?: Date | null;
    holdReason?: string | null;
};
type RequestWithdrawalInput = {
    walletId: string;
    userId: string;
    amount: Prisma.Decimal;
    fee: Prisma.Decimal;
    currency: CurrencyCode;
    payoutMethod: string;
    payoutReference?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
};
export declare class WalletService {
    creditOrderPayout(tx: Prisma.TransactionClient, input: CreditOrderPayoutInput): Promise<{
        id: string;
        walletId: string;
        createdAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.WalletTransactionStatus;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        currency: import(".prisma/client").$Enums.CurrencyCode;
        metadata: Prisma.JsonValue | null;
        referenceKey: string;
        orderId: string | null;
        withdrawRequestId: string | null;
        type: import(".prisma/client").$Enums.WalletTransactionType;
        postedAt: Date | null;
    }>;
    requestWithdrawal(tx: Prisma.TransactionClient, input: RequestWithdrawalInput): Promise<{
        id: string;
        walletId: string;
        userId: string;
        status: import(".prisma/client").$Enums.WithdrawalStatus;
        requestedAt: Date;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        currency: import(".prisma/client").$Enums.CurrencyCode;
        payoutMethod: string;
        payoutReference: Prisma.JsonValue | null;
        metadata: Prisma.JsonValue | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        paidAt: Date | null;
    }>;
}
export {};
