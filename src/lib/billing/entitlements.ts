import { withTenantDb } from "../db/tenantDb";

export async function getSubscriptionEntitlement(tenantId: string) {
  return withTenantDb(tenantId, async (tx) => {
    return tx.subscriptionEntitlement.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });
  });
}

export async function getActiveSeatQuantity(tenantId: string) {
  const entitlement = await getSubscriptionEntitlement(tenantId);
  if (!entitlement) return 0;

  // Stripe statuses vary by billing model; MVP treats "active" as billable.
  if (entitlement.status !== "active") return 0;

  return entitlement.quantity ?? 0;
}

