import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function writeActivityEvent(tx: Tx, params: {
  tenantId: string;
  actorClerkUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: unknown;
}) {
  return tx.activityEvent.create({
    data: {
      tenantId: params.tenantId,
      actorClerkUserId: params.actorClerkUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      metadata: params.metadata as any,
    },
  });
}

export async function writeAuditLog(tx: Tx, params: {
  tenantId: string;
  actorClerkUserId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  diff?: unknown;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return tx.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorClerkUserId: params.actorClerkUserId,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      action: params.action,
      diff: params.diff as any,
      requestId: params.requestId ?? undefined,
      ip: params.ip ?? undefined,
      userAgent: params.userAgent ?? undefined,
    },
  });
}

