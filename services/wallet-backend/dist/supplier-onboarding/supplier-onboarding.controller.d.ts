import { ConsumeDiscordLinkTokenDto } from "./dto/consume-discord-link-token.dto";
import { RegisterSupplierApplicationDto } from "./dto/register-supplier-application.dto";
import { SupplierOnboardingService } from "./supplier-onboarding.service";
export declare class SupplierOnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: SupplierOnboardingService);
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
}
