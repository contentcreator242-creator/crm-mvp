import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getPrisma } from "@/lib/db/prisma";
import { findOrganizationByLeadCapturePublicKey } from "@/lib/auth/organization";
import {
  dedupeFeaturedCatalogLenders,
  ensureDefaultLendersForOrganization,
  ensureFeaturedLendersPresent,
  syncDefaultLendersFromCatalog,
} from "@/lib/lenders/seedDefaultLenders";
import { verifyPublicLeadCaptcha } from "@/lib/security/captcha";
import { rateLimitByIp } from "@/lib/security/rateLimit";
import { PublicLeadCaptureInput } from "@/lib/validation/leadCapture";
import {
  leadSubmissionToSignals,
  prismaLenderToCriteria,
  rankLendersForLead,
} from "@/lib/matching/lenderEngine";
import { findActiveLendersForMatching } from "@/lib/lenders/lenderQueries";
import { createLeadActivity } from "@/lib/leads/activity";

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")?.[0]?.trim() || null;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ip = getClientIp(req) ?? "unknown";

    const raw = await req.json();
    const input = PublicLeadCaptureInput.parse(raw);

    const rate = await rateLimitByIp(ip);
    const allowed = (rate as any)?.success ?? (rate as any)?.allowed ?? false;
    if (!allowed) {
      throw new ApiError({
        status: 429,
        code: "rate_limited",
        message: "Too many submissions. Please try again later.",
      });
    }

    await verifyPublicLeadCaptcha(
      { turnstileToken: input.turnstileToken, recaptchaToken: input.recaptchaToken },
      ip === "unknown" ? null : ip,
    );

    const prisma = getPrisma();

    const org = await findOrganizationByLeadCapturePublicKey(input.organizationPublicKey);

    if (!org) {
      throw new ApiError({
        status: 404,
        code: "not_found",
        message: "Unknown organization key",
      });
    }

    await ensureDefaultLendersForOrganization(org.id);
    await ensureFeaturedLendersPresent(org.id);
    await syncDefaultLendersFromCatalog(org.id);
    await dedupeFeaturedCatalogLenders(org.id);

    const tenant = await prisma.tenant.upsert({
      where: { clerkOrgId: org.clerkOrganizationId },
      create: { clerkOrgId: org.clerkOrganizationId, isBeta: false },
      update: {},
      select: { id: true },
    });
    const tenantId = tenant.id;

    const emptyToNull = (s: string | null | undefined) => {
      const t = typeof s === "string" ? s.trim() : "";
      return t.length ? t : null;
    };

    const phone = emptyToNull(input.phone);
    const lastName = emptyToNull(input.lastName);
    const companyName = emptyToNull(input.companyName);
    const businessType = emptyToNull(input.businessType);
    const notes = emptyToNull(input.notes);
    const leadSource = emptyToNull(input.leadSource);

    // Persist lead + submission first so a matching/Prisma/DB error cannot roll back the CRM lead.
    const { lead, submission } = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

      const leadRow = await tx.lead.create({
        data: {
          organizationId: org.id,
          firstName: input.firstName.trim(),
          lastName: lastName,
          email: input.email.trim(),
          phone,
          companyName,
          status: "new",
          notes,
          requestedAmount: input.requestedAmount ?? null,
          annualRevenue: input.annualRevenue ?? null,
          timeTradingMonths: input.timeTradingMonths ?? null,
          creditIssues: input.creditIssues ?? null,
          businessType,
        },
      });

      const submissionRow = await tx.leadSubmission.create({
        data: {
          tenantId,
          organizationId: org.id,
          leadId: leadRow.id,
          firstName: input.firstName.trim(),
          lastName,
          email: input.email.trim(),
          phone,
          companyName,
          requestedAmount: input.requestedAmount ?? null,
          annualRevenue: input.annualRevenue ?? null,
          timeTradingMonths: input.timeTradingMonths ?? null,
          creditIssues: input.creditIssues ?? null,
          businessType,
          notes,
          leadSource,
        },
      });

      return { lead: leadRow, submission: submissionRow };
    });

    const signals = leadSubmissionToSignals({
      firstName: submission.firstName,
      lastName: submission.lastName,
      email: submission.email,
      phone: submission.phone,
      companyName: submission.companyName,
      requestedAmount: submission.requestedAmount,
      annualRevenue: submission.annualRevenue,
      timeTradingMonths: submission.timeTradingMonths,
      creditIssues: submission.creditIssues,
      businessType: submission.businessType,
      notes: submission.notes,
    });

    await createLeadActivity(prisma, {
      organizationId: org.id,
      leadId: lead.id,
      eventType: "lead_created",
      description: "Lead created from embedded/public form submission.",
      metadata: { submissionId: submission.id, leadSource: submission.leadSource },
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

        const dbLenders = await findActiveLendersForMatching(tx, org.id);

        const criteriaList = dbLenders.map(prismaLenderToCriteria);
        const ranked = rankLendersForLead(signals, criteriaList);

        const matchRow = await tx.lenderMatch.create({
          data: {
            tenantId,
            organizationId: org.id,
            leadSubmissionId: submission.id,
            leadId: lead.id,
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

        // Prisma throws if `data` is empty — rolls back the whole tx and no match is saved.
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
      });
    } catch (err) {
      console.warn("[lead-capture] lender matching failed (lead still saved):", err);
    }

    // Public response: do not expose lender names or match details (CRM-only).
    return NextResponse.json(
      {
        ok: true,
        data: {
          leadId: lead.id,
          submissionId: submission.id,
        },
      },
      { status: 201, headers: corsHeaders() },
    );
  });
}
