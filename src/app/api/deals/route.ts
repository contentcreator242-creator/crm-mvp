import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getPrisma } from "@/lib/db/prisma";
import { markOnboardingFirstDeal } from "@/lib/onboarding/organizationChecklist";

const UuidOpt = z.string().uuid().optional();

const DealCreateInput = z.object({
  title: z.string().min(1).max(200),
  status: z.string().max(50).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  companyId: UuidOpt,
  contactId: UuidOpt,
});

export async function GET() {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    return NextResponse.json({
      ok: true,
      data: await withTenantDb(ctx.tenantId, async (tx) => {
        return tx.deal.findMany({
          where: { tenantId: ctx.tenantId, organizationId },
          orderBy: { createdAt: "desc" },
        });
      }),
    });
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    const input = DealCreateInput.parse(await req.json());

    const created = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.deal.create({
        data: {
          tenantId: ctx.tenantId,
          organizationId,
          title: input.title,
          status: input.status,
          amountCents: input.amountCents,
          currency: input.currency,
          expectedCloseDate: input.expectedCloseDate,
          companyId: input.companyId,
          contactId: input.contactId,
        },
      });
    });

    await markOnboardingFirstDeal(getPrisma(), organizationId);

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  });
}

