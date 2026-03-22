import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { PageHeader } from "@/components/crm-shell";
import { createLeadActivity } from "@/lib/leads/activity";
import {
  collectLeadFieldErrors,
  leadToCoreFormDefaults,
  parseLeadCoreFormData,
  toLeadPrismaData,
} from "@/lib/leads/leadCoreFields";
import {
  coreFinanceFieldsChanged,
  hasCoreFinanceSignalsForMatching,
  leadToMatchSignals,
  tryRunCrmLeadMatchingForLead,
} from "@/lib/matching/runCrmLeadMatching";
import { LeadEditForm, type LeadEditFormState } from "@/components/leads/LeadEditForm";

async function updateLead(
  _prevState: LeadEditFormState,
  formData: FormData,
): Promise<LeadEditFormState> {
  "use server";

  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const leadIdRaw = formData.get("leadId")?.toString()?.trim() ?? "";
  const parsedId = z.string().uuid().safeParse(leadIdRaw);
  if (!parsedId.success) {
    return { ok: false, message: "Invalid lead." };
  }
  const targetId = parsedId.data;

  const parsed = parseLeadCoreFormData(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: collectLeadFieldErrors(parsed.error),
    };
  }

  const existing = await prisma.lead.findFirst({
    where: { id: targetId, organizationId },
    select: {
      status: true,
      requestedAmount: true,
      annualRevenue: true,
      timeTradingMonths: true,
      creditIssues: true,
      businessType: true,
    },
  });
  if (!existing) {
    return { ok: false, message: "Lead not found or you no longer have access." };
  }

  await prisma.lead.updateMany({
    where: {
      id: targetId,
      organizationId,
    },
    data: toLeadPrismaData(parsed.data),
  });

  const updatedLead = await prisma.lead.findFirst({
    where: { id: targetId, organizationId },
  });
  if (!updatedLead) {
    return { ok: false, message: "Lead not found or you no longer have access." };
  }

  if ((existing.status ?? "").toLowerCase() !== parsed.data.status.toLowerCase()) {
    await createLeadActivity(prisma, {
      organizationId,
      leadId: targetId,
      eventType: "status_changed",
      description: `Status changed from ${existing.status ?? "new"} to ${parsed.data.status}.`,
      metadata: { from: existing.status ?? null, to: parsed.data.status },
    });
  }

  const financeBefore = {
    requestedAmount: existing.requestedAmount,
    annualRevenue: existing.annualRevenue,
    timeTradingMonths: existing.timeTradingMonths,
    creditIssues: existing.creditIssues,
    businessType: existing.businessType,
  };
  const financeAfter = {
    requestedAmount: updatedLead.requestedAmount,
    annualRevenue: updatedLead.annualRevenue,
    timeTradingMonths: updatedLead.timeTradingMonths,
    creditIssues: updatedLead.creditIssues,
    businessType: updatedLead.businessType,
  };

  if (
    coreFinanceFieldsChanged(financeBefore, financeAfter) &&
    hasCoreFinanceSignalsForMatching(leadToMatchSignals(updatedLead))
  ) {
    const tenant = await prisma.tenant.upsert({
      where: { clerkOrgId: orgId },
      create: { clerkOrgId: orgId, isBeta: false },
      update: {},
      select: { id: true },
    });

    await tryRunCrmLeadMatchingForLead(
      prisma,
      { tenantId: tenant.id, organizationId, lead: updatedLead },
      "lead-edit-manual",
    );
  }

  redirect(`/leads/${targetId}`);
}

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id } = await params;
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId },
  });

  if (!lead) {
    redirect("/leads");
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Edit lead"
        description="Update contact details, funding criteria, and workflow status."
        eyebrow="Leads"
        actions={
          <Link href={`/leads/${id}`} className="btn-secondary text-sm">
            Back
          </Link>
        }
      />

      <LeadEditForm leadId={id} defaults={leadToCoreFormDefaults(lead)} action={updateLead} />
    </div>
  );
}
