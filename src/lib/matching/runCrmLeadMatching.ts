import type { Lead } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  dedupeFeaturedCatalogLenders,
  ensureDefaultLendersForOrganization,
  ensureFeaturedLendersPresent,
  syncDefaultLendersFromCatalog,
} from "@/lib/lenders/seedDefaultLenders";
import { leadSubmissionToSignals, type LeadMatchSignals } from "@/lib/matching/lenderEngine";
import { persistLenderMatchForLead } from "@/lib/matching/persistLenderMatch";

/**
 * True when at least one core finance / business signal is present so matching is meaningful.
 * CRM manual flows skip persistence when this is false (no crash; no empty noise rows).
 * Public embed still runs the full pipeline every time (unchanged).
 */
export function hasCoreFinanceSignalsForMatching(signals: LeadMatchSignals): boolean {
  if (signals.requestedAmount != null) return true;
  if (signals.annualRevenue != null) return true;
  if (signals.timeTradingMonths != null) return true;
  if ((signals.businessType ?? "").trim().length > 0) return true;
  if (signals.creditIssues !== null) return true;
  return false;
}

export function leadToMatchSignals(lead: Lead): LeadMatchSignals {
  return leadSubmissionToSignals({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    companyName: lead.companyName,
    requestedAmount: lead.requestedAmount,
    annualRevenue: lead.annualRevenue,
    timeTradingMonths: lead.timeTradingMonths,
    creditIssues: lead.creditIssues,
    businessType: lead.businessType,
    notes: lead.notes,
  });
}

export type CoreFinanceSnapshot = Pick<
  Lead,
  "requestedAmount" | "annualRevenue" | "timeTradingMonths" | "creditIssues" | "businessType"
>;

export function coreFinanceFieldsChanged(before: CoreFinanceSnapshot, after: CoreFinanceSnapshot): boolean {
  return (
    before.requestedAmount !== after.requestedAmount ||
    before.annualRevenue !== after.annualRevenue ||
    before.timeTradingMonths !== after.timeTradingMonths ||
    before.creditIssues !== after.creditIssues ||
    (before.businessType ?? "") !== (after.businessType ?? "")
  );
}

/**
 * Runs the same ranking + persistence as `/api/lead-capture` after lenders are seeded for the org.
 * Swallows errors after logging — lead save/update should already have succeeded.
 */
export async function runCrmLeadMatchingForLead(
  prisma: PrismaClient,
  args: { tenantId: string; organizationId: string; lead: Lead },
): Promise<void> {
  const signals = leadToMatchSignals(args.lead);
  if (!hasCoreFinanceSignalsForMatching(signals)) return;

  await ensureDefaultLendersForOrganization(args.organizationId);
  await ensureFeaturedLendersPresent(args.organizationId);
  await syncDefaultLendersFromCatalog(args.organizationId);
  await dedupeFeaturedCatalogLenders(args.organizationId);

  await prisma.$transaction(async (tx) => {
    await persistLenderMatchForLead(tx, {
      tenantId: args.tenantId,
      organizationId: args.organizationId,
      leadId: args.lead.id,
      leadSubmissionId: null,
      signals,
    });
  });

  await prisma.lead.updateMany({
    where: { id: args.lead.id, organizationId: args.organizationId },
    data: { lastMatchedAt: new Date() },
  });
}

export async function tryRunCrmLeadMatchingForLead(
  prisma: PrismaClient,
  args: { tenantId: string; organizationId: string; lead: Lead },
  logLabel: string,
): Promise<void> {
  try {
    await runCrmLeadMatchingForLead(prisma, args);
  } catch (err) {
    console.warn(`[${logLabel}] lender matching failed (lead still saved):`, err);
  }
}
