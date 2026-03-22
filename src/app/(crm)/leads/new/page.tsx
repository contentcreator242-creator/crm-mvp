import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { LeadCreateForm, type LeadCreateFormState } from "./LeadCreateForm";
import { PageHeader } from "@/components/crm-shell";
import { createLeadActivity } from "@/lib/leads/activity";
import { markOnboardingFirstLead } from "@/lib/onboarding/organizationChecklist";
import {
  collectLeadFieldErrors,
  parseLeadCoreFormData,
  toLeadPrismaData,
} from "@/lib/leads/leadCoreFields";
import { tryRunCrmLeadMatchingForLead } from "@/lib/matching/runCrmLeadMatching";

async function createLead(
  _prevState: LeadCreateFormState,
  formData: FormData,
): Promise<LeadCreateFormState> {
  "use server";

  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const parsed = parseLeadCoreFormData(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: collectLeadFieldErrors(parsed.error),
    };
  }

  const lead = await prisma.lead.create({
    data: {
      organizationId,
      ...toLeadPrismaData(parsed.data),
    },
  });

  await createLeadActivity(prisma, {
    organizationId,
    leadId: lead.id,
    eventType: "lead_created",
    description: "Lead created in CRM.",
  });

  await markOnboardingFirstLead(prisma, organizationId);

  const tenant = await prisma.tenant.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, isBeta: false },
    update: {},
    select: { id: true },
  });

  await tryRunCrmLeadMatchingForLead(
    prisma,
    { tenantId: tenant.id, organizationId, lead },
    "lead-create-manual",
  );

  redirect(`/leads/${lead.id}?created=1`);
}

export default async function NewLeadPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="New lead"
        description="Add a prospect with the key details used for lender matching."
        eyebrow="Create"
        actions={
          <Link href="/leads" className="btn-secondary text-sm">
            Back to leads
          </Link>
        }
      />

      <LeadCreateForm action={createLead} />
    </div>
  );
}
