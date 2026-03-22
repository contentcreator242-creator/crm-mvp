"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DealLenderSubmissionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createLeadActivity } from "@/lib/leads/activity";
import {
  markOnboardingFirstSubmissionTracked,
  submissionRowQualifiesAsTracked,
} from "@/lib/onboarding/organizationChecklist";

const STATUS_VALUES = [
  "selected",
  "submitted",
  "approved",
  "declined",
  "funded",
] as const satisfies readonly DealLenderSubmissionStatus[];

const statusSchema = z.enum(STATUS_VALUES);

function leadKeyForActivity(deal: { leadId: string | null; contactId: string | null }): string | null {
  return deal.leadId ?? deal.contactId;
}

/**
 * Update a single lender row on a deal (status, notes) and log timeline activity when status changes.
 */
export async function updateDealLenderSubmissionAction(formData: FormData) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const submissionId = formData.get("submissionId")?.toString()?.trim() ?? "";
  if (!submissionId || !z.string().uuid().safeParse(submissionId).success) {
    redirect("/deals");
  }

  const parsedStatus = statusSchema.safeParse(formData.get("status")?.toString()?.trim());
  if (!parsedStatus.success) redirect("/deals");

  const notesRaw = formData.get("notes")?.toString() ?? "";
  const notes = notesRaw.trim() === "" ? null : notesRaw.trim();

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const row = await prisma.dealLenderSubmission.findFirst({
    where: { id: submissionId, organizationId },
    include: {
      lender: { select: { name: true } },
      deal: {
        select: {
          id: true,
          title: true,
          leadId: true,
          contactId: true,
        },
      },
    },
  });

  if (!row) redirect("/deals");

  const prevStatus = row.status;
  const nextStatus = parsedStatus.data;
  const now = new Date();

  let submittedAt = row.submittedAt;
  let decisionAt = row.decisionAt;

  if (nextStatus === "submitted" && prevStatus !== "submitted" && !submittedAt) {
    submittedAt = now;
  }
  if (
    (nextStatus === "approved" || nextStatus === "declined" || nextStatus === "funded") &&
    prevStatus !== nextStatus
  ) {
    if (!decisionAt) decisionAt = now;
  }

  const updated = await prisma.dealLenderSubmission.update({
    where: { id: row.id },
    data: {
      status: nextStatus,
      notes,
      submittedAt,
      decisionAt,
    },
  });

  if (
    submissionRowQualifiesAsTracked({
      status: updated.status,
      notes: updated.notes,
      submittedAt: updated.submittedAt,
      decisionAt: updated.decisionAt,
    })
  ) {
    await markOnboardingFirstSubmissionTracked(prisma, organizationId);
  }

  console.log("[updateDealLenderSubmission]", {
    submissionId: row.id,
    dealId: row.deal.id,
    organizationId,
    prevStatus,
    nextStatus,
    updatedAt: updated.updatedAt,
  });

  if (prevStatus !== nextStatus) {
    const leadId = leadKeyForActivity(row.deal);
    if (leadId) {
      await createLeadActivity(prisma, {
        organizationId,
        leadId,
        dealId: row.deal.id,
        eventType: "deal_lender_status_changed",
        description: `${row.lender.name}: ${prevStatus} → ${nextStatus}.`,
        metadata: {
          dealId: row.deal.id,
          submissionId: row.id,
          lenderId: row.lenderId,
          lenderName: row.lender.name,
          from: prevStatus,
          to: nextStatus,
        },
      });
    }
  }

  revalidatePath(`/deals/${row.deal.id}`);
  revalidatePath("/deals");
  const lid = leadKeyForActivity(row.deal);
  if (lid) revalidatePath(`/leads/${lid}`);

  redirect(`/deals/${row.deal.id}`);
}
