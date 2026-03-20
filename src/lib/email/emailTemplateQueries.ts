import type { PrismaClient } from "@prisma/client";

export type EmailTemplateRow = {
  id: string;
  organizationId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Uses `$queryRaw` so this works even when the dev server holds a Prisma singleton
 * generated before `email_templates` existed (delegate would be undefined until regenerate + restart).
 */
export async function listEmailTemplatesForOrganization(
  prisma: Pick<PrismaClient, "$queryRaw">,
  organizationId: string,
): Promise<EmailTemplateRow[]> {
  return prisma.$queryRaw<EmailTemplateRow[]>`
    SELECT
      id::text AS id,
      organization_id::text AS "organizationId",
      name,
      subject,
      body,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM email_templates
    WHERE organization_id::text = ${organizationId}
    ORDER BY name ASC
  `;
}

export async function getEmailTemplateForOrganization(
  prisma: Pick<PrismaClient, "$queryRaw">,
  organizationId: string,
  templateId: string,
): Promise<EmailTemplateRow | null> {
  const rows = await prisma.$queryRaw<EmailTemplateRow[]>`
    SELECT
      id::text AS id,
      organization_id::text AS "organizationId",
      name,
      subject,
      body,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM email_templates
    WHERE id::text = ${templateId}
      AND organization_id::text = ${organizationId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
