import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { InternalAuthGuard } from "../common/internal-auth.guard";
import { ConsumeDiscordLinkTokenDto } from "./dto/consume-discord-link-token.dto";
import { RegisterSupplierApplicationDto } from "./dto/register-supplier-application.dto";
import { SupplierOnboardingService } from "./supplier-onboarding.service";

@Controller("internal")
@UseGuards(InternalAuthGuard)
export class SupplierOnboardingController {
  constructor(private readonly onboardingService: SupplierOnboardingService) {}

  @Post("discord/applications")
  async registerApplication(@Body() dto: RegisterSupplierApplicationDto) {
    return this.onboardingService.registerApplication(dto);
  }

  @Post("discord-link/consume")
  async consumeLinkToken(@Body() dto: ConsumeDiscordLinkTokenDto) {
    return this.onboardingService.consumeLinkToken(dto);
  }
}