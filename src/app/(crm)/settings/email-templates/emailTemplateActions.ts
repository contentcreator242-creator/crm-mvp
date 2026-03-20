"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";

const TemplateFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(100_000),
});

async function requireOrgContext() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  return { prisma, organizationId };
}

export async function createEmailTemplateAction(formData: FormData) {
  const { prisma, organizationId } = await requireOrgContext();

  const parsed = TemplateFields.safeParse({
    name: formData.get("name")?.toString(),
    subject: formData.get("subject")?.toString(),
    body: formData.get("body")?.toString(),
  });

  if (!parsed.success) {
    redirect(
      `/settings/email-templates/new?e=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
    );
  }

  const { name, subject, body } = parsed.data;

  await prisma.$executeRaw`
    INSERT INTO email_templates (id, organization_id, name, subject, body, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      ${organizationId}::uuid,
      ${name},
      ${subject},
      ${body},
      NOW(),
      NOW()
    )
  `;

  revalidatePath("/settings/email-templates");
  revalidatePath("/leads");
  redirect("/settings/email-templates");
}

export async function updateEmailTemplateAction(formData: FormData) {
  const { prisma, organizationId } = await requireOrgContext();

  const id = formData.get("templateId")?.toString()?.trim();
  if (!id) redirect("/settings/email-templates?e=missing_template");

  const parsed = TemplateFields.safeParse({
    name: formData.get("name")?.toString(),
    subject: formData.get("subject")?.toString(),
    body: formData.get("body")?.toString(),
  });

  if (!parsed.success) {
    redirect(
      `/settings/email-templates/${id}/edit?e=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
    );
  }

  const { name, subject, body } = parsed.data;

  const n = await prisma.$executeRaw`
    UPDATE email_templates
    SET
      name = ${name},
      subject = ${subject},
      body = ${body},
      updated_at = NOW()
    WHERE id::text = ${id}
      AND organization_id::text = ${organizationId}
  `;

  if (Number(n) === 0) {
    redirect("/settings/email-templates?e=not_found");
  }

  revalidatePath("/settings/email-templates");
  revalidatePath("/leads");
  redirect("/settings/email-templates");
}

export async function deleteEmailTemplateAction(formData: FormData) {
  const { prisma, organizationId } = await requireOrgContext();

  const id = formData.get("templateId")?.toString()?.trim();
  if (!id) redirect("/settings/email-templates");

  await prisma.$executeRaw`
    DELETE FROM email_templates
    WHERE id::text = ${id}
      AND organization_id::text = ${organizationId}
  `;

  revalidatePath("/settings/email-templates");
  revalidatePath("/leads");
  redirect("/settings/email-templates");
}
