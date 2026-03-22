import type { DealLenderSubmissionStatus, PrismaClient } from "@prisma/client";

/**
 * Organization onboarding checklist — stored on `Organization` as nullable timestamps
 * (`onboardingFirstLeadAt`, etc.). Each is set once when the milestone first occurs.
 */

export async function markOnboardingFirstLead(db: PrismaClient, organizationId: string) {
  await db.organization.updateMany({
    where: { id: organizationId, onboardingFirstLeadAt: null },
    data: { onboardingFirstLeadAt: new Date() },
  });
}

export async function markOnboardingFirstLenderSelection(db: PrismaClient, organizationId: string) {
  await db.organization.updateMany({
    where: { id: organizationId, onboardingFirstLenderSelectionAt: null },
    data: { onboardingFirstLenderSelectionAt: new Date() },
  });
}

export async function markOnboardingFirstDeal(db: PrismaClient, organizationId: string) {
  await db.organization.updateMany({
    where: { id: organizationId, onboardingFirstDealAt: null },
    data: { onboardingFirstDealAt: new Date() },
  });
}

export async function markOnboardingFirstSubmissionTracked(db: PrismaClient, organizationId: string) {
  await db.organization.updateMany({
    where: { id: organizationId, onboardingFirstSubmissionTrackedAt: null },
    data: { onboardingFirstSubmissionTrackedAt: new Date() },
  });
}

/** Whether a lender submission row counts as “tracked” for onboarding milestone 4. */
export function submissionRowQualifiesAsTracked(input: {
  status: DealLenderSubmissionStatus;
  notes: string | null;
  submittedAt: Date | null;
  decisionAt: Date | null;
}): boolean {
  if (input.status !== "selected") return true;
  if (input.notes != null && input.notes.trim().length > 0) return true;
  if (input.submittedAt != null) return true;
  if (input.decisionAt != null) return true;
  return false;
}
