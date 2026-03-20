import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const IdParam = z.object({
  id: z.string().uuid(),
});

const DealUpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.string().max(50).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  companyId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    const { id } = IdParam.parse(await params);

    const deal = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.deal.findFirst({ where: { id, tenantId: ctx.tenantId, organizationId } });
    });

    if (!deal) throw new ApiError({ status: 404, code: "not_found", message: "Deal not found" });

    return NextResponse.json({ ok: true, data: deal });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    const { id } = IdParam.parse(await params);
    const input = DealUpdateInput.parse(await req.json());

    const updated = await withTenantDb(ctx.tenantId, async (tx) => {
      const res = await tx.deal.updateMany({
        where: { id, tenantId: ctx.tenantId, organizationId },
        data: {
          title: input.title,
          status: input.status,
          amountCents: input.amountCents,
          currency: input.currency,
          expectedCloseDate: input.expectedCloseDate,
          companyId: input.companyId,
          contactId: input.contactId,
        },
      });

      if (res.count === 0) return null;
      return tx.deal.findFirst({ where: { id, tenantId: ctx.tenantId, organizationId } });
    });

    if (!updated) throw new ApiError({ status: 404, code: "not_found", message: "Deal not found" });
    return NextResponse.json({ ok: true, data: updated });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    const { id } = IdParam.parse(await params);

    await withTenantDb(ctx.tenantId, async (tx) => {
      const res = await tx.deal.deleteMany({
        where: { id, tenantId: ctx.tenantId, organizationId },
      });
      if (res.count === 0) {
        throw new ApiError({ status: 404, code: "not_found", message: "Deal not found" });
      }
    });

    return NextResponse.json({ ok: true });
  });
}

