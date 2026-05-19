import { AntifraudService } from "../antifraud/antifraud.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { CreateWithdrawalRequestDto } from "./dto/create-withdrawal-request.dto";
export declare class WithdrawalsService {
    private readonly prisma;
    private readonly antifraudService;
    private readonly walletService;
    private readonly auditService;
    constructor(prisma: PrismaService, antifraudService: AntifraudService, walletService: WalletService, auditService: AuditService);
    create(dto: CreateWithdrawalRequestDto): Promise<{
        ok: boolean;
        withdrawRequestId: string;
    }>;
    private toCurrency;
}
