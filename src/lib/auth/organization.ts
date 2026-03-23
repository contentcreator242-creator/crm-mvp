import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db/prisma";
import {
  dedupeFeaturedCatalogLenders,
  ensureDefaultLendersForOrganization,
  syncDefaultLendersFromCatalog,
} from "@/lib/lenders/seedDefaultLenders";

/**
 * Read/update lead capture key via raw SQL so runtime works even if `prisma generate`
 * was not re-run after adding `lead_capture_public_key` to the schema.
 */
export async function ensureLeadCapturePublicKey(organizationId: string): Promise<string> {
  const prisma = getPrisma();

  const rows = await prisma.$queryRaw<{ key: string | null }[]>`
    SELECT lead_capture_public_key::text AS key
    FROM organizations
    WHERE id::text = ${organizationId}
    LIMIT 1
  `;

  const existing = rows[0]?.key;
  if (existing) return existing;

  const newKey = randomUUID();

  await prisma.$executeRaw`
    UPDATE organizations
    SET lead_capture_public_key = CAST(${newKey} AS uuid)
    WHERE id::text = ${organizationId}
      AND lead_capture_public_key IS NULL
  `;

  const again = await prisma.$queryRaw<{ key: string | null }[]>`
    SELECT lead_capture_public_key::text AS key
    FROM organizations
    WHERE id::text = ${organizationId}
    LIMIT 1
  `;

  const key = again[0]?.key;
  if (key) return key;

  throw new Error("Failed to set lead_capture_public_key");
}

export async function findOrganizationByLeadCapturePublicKey(publicKey: string): Promise<{
  id: string;
  clerkOrganizationId: string;
} | null> {
  const prisma = getPrisma();

  const rows = await prisma.$queryRaw<{ id: string; clerk_organization_id: string }[]>`
    SELECT id::text AS id, clerk_organization_id
    FROM organizations
    WHERE lead_capture_public_key::text = ${publicKey}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    clerkOrganizationId: row.clerk_organization_id,
  };
}

export async function resolveOrganizationId(clerkOrganizationId: string, name?: string | null) {
  const t0 = performance.now();
  const prisma = getPrisma();
  const org = await prisma.organization.upsert({
    where: { clerkOrganizationId },
    create: {
      clerkOrganizationId,
      name: name ?? null,
    },
    // Do not sync `name` from Clerk on every request — it is user-editable in Settings / onboarding.
    update: {},
    select: { id: true },
  });

  await provisionOrganizationAfterUpsert(org.id);
  console.info("[perf] resolve-organization-id", {
    organizationId: org.id,
    elapsedMs: Math.round(performance.now() - t0),
  });

  return org.id;
}

/** Lead capture key + default lender catalog (call after upserting an organization row). */
export async function provisionOrganizationAfterUpsert(organizationId: string): Promise<void> {
  const t0 = performance.now();
  await ensureLeadCapturePublicKey(organizationId);
  await ensureDefaultLendersForOrganization(organizationId);
  await syncDefaultLendersFromCatalog(organizationId);
  /** Removes duplicate rows for the three featured catalog names (race / legacy double-seed). */
  await dedupeFeaturedCatalogLenders(organizationId);
  console.info("[perf] provision-organization", {
    organizationId,
    elapsedMs: Math.round(performance.now() - t0),
  });
}
