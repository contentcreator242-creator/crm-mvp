import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma";

/**
 * Execute DB operations under a tenant-safe Postgres session context.
 *
 * Important: Prisma connection pooling means the tenant session variable must be
 * set inside the same transaction/connection as the subsequent queries.
 */
export async function withTenantDb<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    // RLS policies read from this session var.
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

