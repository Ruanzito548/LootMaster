import { AuditActorType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
type AuditInput = {
    actorType: AuditActorType;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceFingerprint?: string | null;
};
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: AuditInput, tx?: Prisma.TransactionClient): Promise<{
        id: string;
        createdAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
        deviceFingerprint: string | null;
        metadata: Prisma.JsonValue | null;
        actorType: import(".prisma/client").$Enums.AuditActorType;
        actorId: string | null;
        action: string;
        entityType: string;
        entityId: string;
    }>;
}
export {};
