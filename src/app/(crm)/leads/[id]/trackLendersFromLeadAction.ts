"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createLeadActivity } from "@/lib/leads/activity";
import {
  markOnboardingFirstDeal,
  markOnboardingFirstLenderSelection,
} from "@/lib/onboarding/organizationChecklist";

/**
 * Add one or more org lenders to the lead's deal as tracked submissions (status: selected).
 * Uses a single deal per lead (`leadId` / `contactId`), creating it if needed.
 */
export async function trackLendersFromLeadAction(formData: FormData) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const leadIdRaw = formData.get("leadId")?.toString()?.trim() ?? "";
  if (!leadIdRaw) redirect("/leads");

  const rawIds = formData.getAll("lenderIds").map((v) => v?.toString()?.trim()).filter(Boolean);
  const lenderIds = Array.from(new Set(rawIds)).filter((id) => z.string().uuid().safeParse(id).success);

  const leadId = leadIdRaw;
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  if (lenderIds.length === 0) {
    redirect(`/leads/${leadId}`);
  }

  const leadRow = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      requestedAmount: true,
    },
  });
  if (!leadRow) redirect("/leads");

  const lendersOk = await prisma.lender.findMany({
    where: { organizationId, id: { in: lenderIds } },
    select: { id: true, name: true },
  });
  if (lendersOk.length === 0) {
    redirect(`/leads/${leadId}`);
  }

  const tenantRow = await prisma.tenant.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, isBeta: false },
    update: {},
    select: { id: true },
  });

  const leadName = `${leadRow.firstName} ${leadRow.lastName ?? ""}`.trim();
  const dealTitle = `Lender applications — ${leadName || "Lead"}`;

  let deal = await prisma.deal.findFirst({
    where: {
      organizationId,
      OR: [{ leadId }, { contactId: leadId }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      value: true,
      amountCents: true,
    },
  });

  const requested = leadRow.requestedAmount;
  const dealHasValue =
    deal != null &&
    (deal.value != null || (deal.amountCents != null && deal.amountCents > 0));
  const valuePatch =
    deal != null && requested != null && !dealHasValue ? { value: requested } : {};

  if (!deal) {
    const created = await prisma.deal.create({
      data: {
        tenantId: tenantRow.id,
        organizationId,
        contactId: leadId,
        leadId,
        title: dealTitle,
        status: "new",
        name: leadName,
        stage: "new",
        ...(requested != null ? { value: requested } : {}),
      },
      select: { id: true },
    });
    deal = { id: created.id, value: requested ?? null, amountCents: null };
  } else if (Object.keys(valuePatch).length > 0) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: valuePatch,
    });
  }

  const dealId = deal.id;

  await markOnboardingFirstDeal(prisma, organizationId);

  if ((leadRow.status ?? "").toLowerCase() === "new") {
    await prisma.lead.updateMany({
      where: { id: leadId, organizationId },
      data: { status: "in_progress" },
    });
    await createLeadActivity(prisma, {
      organizationId,
      leadId,
      eventType: "status_changed",
      description: `Status changed from ${leadRow.status ?? "new"} to in_progress.`,
      metadata: { from: leadRow.status ?? null, to: "in_progress" },
    });
  }

  let createdNewLenderSelection = false;
  for (const lender of lendersOk) {
    const existing = await prisma.dealLenderSubmission.findUnique({
      where: {
        dealId_lenderId: { dealId, lenderId: lender.id },
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.dealLenderSubmission.create({
      data: {
        organizationId,
        dealId,
        lenderId: lender.id,
        status: "selected",
      },
    });
    createdNewLenderSelection = true;

    await createLeadActivity(prisma, {
      organizationId,
      leadId,
      dealId,
      eventType: "lender_selected_for_deal",
      description: `Selected ${lender.name} for deal tracking.`,
      metadata: { dealId, lenderId: lender.id, lenderName: lender.name },
    });
  }

  if (createdNewLenderSelection) {
    await markOnboardingFirstLenderSelection(prisma, organizationId);
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/leads/${leadId}`);

  redirect(`/leads/${leadId}`);
}
