import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { InternalAuthGuard } from "../common/internal-auth.guard";
import { CreateWithdrawalRequestDto } from "./dto/create-withdrawal-request.dto";
import { WithdrawalsService } from "./withdrawals.service";

@Controller("withdrawals")
@UseGuards(InternalAuthGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  async create(@Body() dto: CreateWithdrawalRequestDto) {
    return this.withdrawalsService.create(dto);
  }
}