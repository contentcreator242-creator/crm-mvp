import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const ContactCreateInput = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

export async function GET() {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();

    return NextResponse.json({
      ok: true,
      data: await withTenantDb(ctx.tenantId, async (tx) => {
        return tx.contact.findMany({
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
    const input = ContactCreateInput.parse(await req.json());

    const created = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.contact.create({
        data: {
          tenantId: ctx.tenantId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
        },
      });
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  });
}

