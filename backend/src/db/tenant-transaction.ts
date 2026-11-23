import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Run tenant-scoped database work with a transaction-local RLS context. */
export function withTenantTransaction<T>(
  tenantId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return work(tx);
  });
}
