"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createLeadActivity } from "@/lib/leads/activity";
import {
  hasCoreFinanceSignalsForMatching,
  leadToMatchSignals,
  runCrmLeadMatchingForLead,
} from "@/lib/matching/runCrmLeadMatching";

/**
 * Re-runs the same CRM matching pipeline as create/edit (rank + persist match + explanations).
 */
export async function refreshLenderMatchesForLeadAction(formData: FormData) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const leadIdRaw = formData.get("leadId")?.toString()?.trim() ?? "";
  const parsedId = z.string().uuid().safeParse(leadIdRaw);
  if (!parsedId.success) redirect("/leads");

  const leadId = parsedId.data;
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });
  if (!lead) redirect("/leads");

  const signals = leadToMatchSignals(lead);
  if (!hasCoreFinanceSignalsForMatching(signals)) {
    revalidatePath(`/leads/${leadId}`);
    redirect(`/leads/${leadId}?refresh=insufficient`);
  }

  const tenant = await prisma.tenant.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, isBeta: false },
    update: {},
    select: { id: true },
  });

  try {
    await runCrmLeadMatchingForLead(prisma, {
      tenantId: tenant.id,
      organizationId,
      lead,
    });
  } catch (err) {
    console.warn("[refresh-lender-matches] matching failed:", err);
    revalidatePath(`/leads/${leadId}`);
    redirect(`/leads/${leadId}?refresh=error`);
  }

  await createLeadActivity(prisma, {
    organizationId,
    leadId,
    eventType: "lender_matches_refreshed",
    description: "Lender matches refreshed",
  });

  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}?refresh=ok`);
}
