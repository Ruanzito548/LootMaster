import { IsOptional, IsString } from "class-validator";

export class CompleteOrderDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  threadId?: string | null;

  @IsOptional()
  @IsString()
  completedByUid?: string | null;
}