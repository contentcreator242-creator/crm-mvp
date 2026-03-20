import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const IdParam = z.object({
  id: z.string().uuid(),
});

const CompanyUpdateInput = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().max(255).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);

    const company = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.company.findFirst({ where: { id, tenantId: ctx.tenantId } });
    });

    if (!company) {
      throw new ApiError({ status: 404, code: "not_found", message: "Company not found" });
    }

    return NextResponse.json({ ok: true, data: company });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);
    const input = CompanyUpdateInput.parse(await req.json());

    const updated = await withTenantDb(ctx.tenantId, async (tx) => {
      const res = await tx.company.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data: {
          name: input.name,
          domain: input.domain,
        },
      });

      if (res.count === 0) return null;
      return tx.company.findFirst({ where: { id, tenantId: ctx.tenantId } });
    });

    if (!updated) {
      throw new ApiError({ status: 404, code: "not_found", message: "Company not found" });
    }

    return NextResponse.json({ ok: true, data: updated });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);

    await withTenantDb(ctx.tenantId, async (tx) => {
      const res = await tx.company.deleteMany({ where: { id, tenantId: ctx.tenantId } });
      if (res.count === 0) {
        throw new ApiError({ status: 404, code: "not_found", message: "Company not found" });
      }
    });

    return NextResponse.json({ ok: true });
  });
}

