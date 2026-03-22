import type { Prisma } from "@prisma/client";
import { prismaLenderToCriteria, rankLendersForLead, type LeadMatchSignals } from "@/lib/matching/lenderEngine";
import { findActiveLendersForMatching } from "@/lib/lenders/lenderQueries";

export type PersistLenderMatchParams = {
  tenantId: string;
  organizationId: string;
  leadId: string;
  /** Public/embed flow sets this; CRM-only manual matches omit it. */
  leadSubmissionId?: string | null;
  signals: LeadMatchSignals;
};

/**
 * Persists ranked lender results + per-lender explanations for a lead.
 * Same pipeline used by the public lead-capture API and CRM manual flows.
 *
 * Caller must run inside `prisma.$transaction` and set `app.current_tenant_id` if required
 * (this function sets it via raw SQL, matching `/api/lead-capture`).
 */
export async function persistLenderMatchForLead(
  tx: Prisma.TransactionClient,
  params: PersistLenderMatchParams,
): Promise<void> {
  const { tenantId, organizationId, leadId, leadSubmissionId = null, signals } = params;

  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

  const dbLenders = await findActiveLendersForMatching(tx, organizationId);
  const criteriaList = dbLenders.map(prismaLenderToCriteria);
  const ranked = rankLendersForLead(signals, criteriaList);

  const matchRow = await tx.lenderMatch.create({
    data: {
      tenantId,
      organizationId,
      leadSubmissionId,
      leadId,
      results: {
        rankedResults: ranked.map((r) => ({
          lenderName: r.lenderName,
          score: r.score,
          rank: r.rank,
          explanation: r.explanation,
          criteriaConfidence: r.criteriaConfidence,
        })),
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  if (ranked.length > 0) {
    await tx.lenderMatchExplanation.createMany({
      data: ranked.map((r) => ({
        tenantId,
        matchId: matchRow.id,
        lenderName: r.lenderName,
        rank: r.rank,
        score: r.score,
        explanation: r.explanation,
      })),
    });
  }
}
