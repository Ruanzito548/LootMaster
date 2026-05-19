import { IsOptional, IsString } from "class-validator";

export class AssignSupplierDto {
  @IsString()
  orderId!: string;

  @IsString()
  supplierDiscordId!: string;

  @IsOptional()
  @IsString()
  supplierDiscordUsername?: string | null;

  @IsOptional()
  @IsString()
  assignedByUid?: string | null;
}