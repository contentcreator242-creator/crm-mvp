import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const CompanyCreateInput = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(255).optional(),
});

export async function GET() {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();

    return NextResponse.json({
      ok: true,
      data: await withTenantDb(ctx.tenantId, async (tx) => {
        return tx.company.findMany({
          where: { tenantId: ctx.tenantId },
          orderBy: { createdAt: "desc" },
        });
      }),
    });
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const input = CompanyCreateInput.parse(await req.json());

    const created = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.company.create({
        data: {
          tenantId: ctx.tenantId,
          name: input.name,
          domain: input.domain,
        },
      });
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  });
}

