import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import {
  leadSubmissionToSignals,
  prismaLenderToCriteria,
  rankLendersForLead,
} from "@/lib/matching/lenderEngine";
import { writeActivityEvent, writeAuditLog } from "@/lib/audit/auditLog";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { findActiveLendersForMatching } from "@/lib/lenders/lenderQueries";

const RankInput = z.object({
  leadSubmissionId: z.string().uuid(),
});

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const input = RankInput.parse(await req.json());

    const h = await headers();
    const requestId = h.get("x-request-id");
    const ip = h.get("x-forwarded-for")?.split(",")?.[0]?.trim() ?? null;
    const userAgent = h.get("user-agent");

    const match = await withTenantDb(ctx.tenantId, async (tx) => {
      const lead = await tx.leadSubmission.findFirst({
        where: { id: input.leadSubmissionId, tenantId: ctx.tenantId },
      });

      if (!lead) {
        throw new ApiError({
          status: 404,
          code: "not_found",
          message: "Lead not found",
        });
      }

      const orgId = lead.organizationId;
      const criteriaList =
        orgId != null
          ? (await findActiveLendersForMatching(tx, orgId)).map(prismaLenderToCriteria)
          : [];

      const ranked = rankLendersForLead(leadSubmissionToSignals(lead), criteriaList);

      const createdMatch = await tx.lenderMatch.create({
        data: {
          tenantId: ctx.tenantId,
          organizationId: orgId,
          leadSubmissionId: lead.id,
          leadId: lead.leadId,
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
            tenantId: ctx.tenantId,
            matchId: createdMatch.id,
            lenderName: r.lenderName,
            rank: r.rank,
            score: r.score,
            explanation: r.explanation,
          })),
        });
      }

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "lenderMatch",
        entityId: createdMatch.id,
        action: "create",
        metadata: { leadSubmissionId: lead.id },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "lenderMatch",
        entityId: createdMatch.id,
        action: "create",
        diff: { leadSubmissionId: lead.id },
        requestId,
        ip,
        userAgent,
      });

      return createdMatch.id;
    });

    return NextResponse.json({
      ok: true,
      data: {
        matchId: match,
      },
    });
  });
}
