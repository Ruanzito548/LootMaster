import { IsOptional, IsString } from "class-validator";

export class RegisterSupplierApplicationDto {
  @IsString()
  orderId!: string;

  @IsString()
  discordId!: string;

  @IsString()
  discordUsername!: string;

  @IsOptional()
  @IsString()
  discordGlobalName?: string | null;
}