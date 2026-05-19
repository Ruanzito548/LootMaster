import { Type } from "class-transformer";
import { IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class UpsertPaidOrderDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  supplierPayout!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}