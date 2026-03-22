import type { PrismaClient } from "@prisma/client";

const FALLBACK_WORKSPACE = "Your workspace";

/** Display label for CRM shell and similar (organization `name` or fallback). */
export function workspaceDisplayLabel(name: string | null | undefined): string {
  const t = name?.trim();
  return t && t.length > 0 ? t : FALLBACK_WORKSPACE;
}

/**
 * Resolve workspace display name for embed / emails by lead capture public key.
 * Returns `null` if the key is unknown.
 */
export async function getOrganizationNameByLeadCaptureKey(
  prisma: Pick<PrismaClient, "organization">,
  publicKey: string,
): Promise<string | null> {
  if (!publicKey.trim()) return null;
  const row = await prisma.organization.findFirst({
    where: { leadCapturePublicKey: publicKey },
    select: { name: true },
  });
  const t = row?.name?.trim();
  return t && t.length > 0 ? t : null;
}

export async function getOrganizationNameById(
  prisma: Pick<PrismaClient, "organization">,
  organizationId: string,
): Promise<string | null> {
  const row = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  const t = row?.name?.trim();
  return t && t.length > 0 ? t : null;
}
