import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditActorType, CurrencyCode, OrderStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { AntifraudService } from "../antifraud/antifraud.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queues/queue.service";
import { ConsumeDiscordLinkTokenDto } from "./dto/consume-discord-link-token.dto";
import { RegisterSupplierApplicationDto } from "./dto/register-supplier-application.dto";

@Injectable()
export class SupplierOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antifraudService: AntifraudService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  async registerApplication(dto: RegisterSupplierApplicationDto) {
    const siteUrl = (process.env.APP_URL ?? "https://site.com").replace(/\/$/, "");

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.upsert({
        where: { externalOrderId: dto.orderId },
        update: {},
        create: {
          externalOrderId: dto.orderId,
          totalAmount: new Prisma.Decimal(0),
          supplierPayout: new Prisma.Decimal(0),
          currency: CurrencyCode.USD,
          status: OrderStatus.CREATED,
        },
      });

      const linkedUser = await tx.user.findUnique({
        where: { discordId: dto.discordId },
      });

      await tx.supplierApplication.upsert({
        where: {
          orderId_discordId: {
            orderId: order.id,
            discordId: dto.discordId,
          },
        },
        update: {
          discordUsername: dto.discordUsername,
          linkedUserId: linkedUser?.id ?? null,
          appliedAt: new Date(),
        },
        create: {
          orderId: order.id,
          discordId: dto.discordId,
          discordUsername: dto.discordUsername,
          linkedUserId: linkedUser?.id ?? null,
        },
      });

      if (linkedUser) {
        return {
          linkRequired: false,
          registrationUrl: null,
          dmQueued: false,
        };
      }

      const token = randomUUID();
      const registrationUrl = `${siteUrl}/cadastro?token=${encodeURIComponent(token)}`;

      await tx.discordLinkToken.create({
        data: {
          discordId: dto.discordId,
          token,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      await this.auditService.log(
        {
          actorType: AuditActorType.DISCORD_BOT,
          actorId: dto.discordId,
          action: "discord.link_token.created",
          entityType: "discord_link_token",
          entityId: token,
          metadata: {
            externalOrderId: dto.orderId,
          },
        },
        tx,
      );

      await this.queueService.enqueueDiscordLinkDm({
        discordId: dto.discordId,
        registrationUrl,
      });

      return {
        linkRequired: true,
        registrationUrl,
        dmQueued: true,
      };
    });
  }

  async consumeLinkToken(dto: ConsumeDiscordLinkTokenDto) {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.discordLinkToken.findUnique({
        where: { token: dto.token },
      });

      if (!token || token.usedAt || token.expiresAt < new Date()) {
        throw new NotFoundException("Link token is invalid or expired.");
      }

      await this.antifraudService.assertDiscordCanLink(tx, token.discordId, dto.siteUserId);

      const existingUser = await tx.user.findUnique({
        where: { discordId: token.discordId },
        include: { wallet: true },
      });

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              siteUserId: dto.siteUserId,
              discordUsername: dto.discordUsername,
              email: dto.email ?? existingUser.email,
            },
            include: { wallet: true },
          })
        : await tx.user.create({
            data: {
              siteUserId: dto.siteUserId,
              discordId: token.discordId,
              discordUsername: dto.discordUsername,
              email: dto.email ?? null,
              wallet: {
                create: {
                  currency: this.defaultCurrency(),
                },
              },
            },
            include: { wallet: true },
          });

      if (!user.wallet) {
        throw new ConflictException("Linked user must have a wallet.");
      }

      if (existingUser && !existingUser.wallet) {
        await tx.wallet.create({
          data: {
            userId: user.id,
            currency: this.defaultCurrency(),
          },
        });
      }

      await tx.discordLinkToken.update({
        where: { id: token.id },
        data: {
          usedAt: new Date(),
          linkedUserId: user.id,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          walletId: user.wallet.id,
        },
      });

      await tx.supplierApplication.updateMany({
        where: { discordId: token.discordId },
        data: { linkedUserId: user.id },
      });

      await tx.order.updateMany({
        where: { assignedSupplierDiscordId: token.discordId },
        data: { assignedSupplierUserId: user.id },
      });

      await this.auditService.log(
        {
          actorType: AuditActorType.USER,
          actorId: user.id,
          action: "discord.link_token.consumed",
          entityType: "user",
          entityId: user.id,
          metadata: {
            discordId: token.discordId,
          },
        },
        tx,
      );

      return { linked: true, userId: user.id, walletId: user.wallet.id };
    });
  }

  private defaultCurrency(): CurrencyCode {
    const configured = (process.env.DEFAULT_WALLET_CURRENCY ?? "USD").trim().toUpperCase();
    if (configured === "BRL" || configured === "EUR" || configured === "GBP") {
      return configured;
    }

    return CurrencyCode.USD;
  }
}