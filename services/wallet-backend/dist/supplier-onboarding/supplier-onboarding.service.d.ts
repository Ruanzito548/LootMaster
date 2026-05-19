import { AntifraudService } from "../antifraud/antifraud.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queues/queue.service";
import { ConsumeDiscordLinkTokenDto } from "./dto/consume-discord-link-token.dto";
import { RegisterSupplierApplicationDto } from "./dto/register-supplier-application.dto";
export declare class SupplierOnboardingService {
    private readonly prisma;
    private readonly antifraudService;
    private readonly auditService;
    private readonly queueService;
    constructor(prisma: PrismaService, antifraudService: AntifraudService, auditService: AuditService, queueService: QueueService);
    registerApplication(dto: RegisterSupplierApplicationDto): Promise<{
        linkRequired: boolean;
        registrationUrl: null;
        dmQueued: boolean;
    } | {
        linkRequired: boolean;
        registrationUrl: string;
        dmQueued: boolean;
    }>;
    consumeLinkToken(dto: ConsumeDiscordLinkTokenDto): Promise<{
        linked: boolean;
        userId: string;
        walletId: string;
    }>;
    private defaultCurrency;
}
