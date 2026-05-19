import { CreateWithdrawalRequestDto } from "./dto/create-withdrawal-request.dto";
import { WithdrawalsService } from "./withdrawals.service";
export declare class WithdrawalsController {
    private readonly withdrawalsService;
    constructor(withdrawalsService: WithdrawalsService);
    create(dto: CreateWithdrawalRequestDto): Promise<{
        ok: boolean;
        withdrawRequestId: string;
    }>;
}
