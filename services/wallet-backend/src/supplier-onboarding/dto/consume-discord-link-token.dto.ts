import { IsOptional, IsString } from "class-validator";

export class ConsumeDiscordLinkTokenDto {
  @IsString()
  token!: string;

  @IsString()
  siteUserId!: string;

  @IsString()
  discordId!: string;

  @IsString()
  discordUsername!: string;

  @IsOptional()
  @IsString()
  email?: string | null;
}