import { Type } from "class-transformer";
import { IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateWithdrawalRequestDto {
  @IsString()
  userId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee!: number;

  @IsString()
  currency!: string;

  @IsString()
  payoutMethod!: string;

  @IsOptional()
  @IsObject()
  payoutReference?: Record<string, unknown>;
}