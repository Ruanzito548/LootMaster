export declare class CreateWithdrawalRequestDto {
    userId: string;
    amount: number;
    fee: number;
    currency: string;
    payoutMethod: string;
    payoutReference?: Record<string, unknown>;
}
