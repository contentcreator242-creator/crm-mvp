import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const IdParam = z.object({
  id: z.string().uuid(),
});

const ContactUpdateInput = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);

    const contact = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.contact.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
    });

    if (!contact) {
      throw new ApiError({ status: 404, code: "not_found", message: "Contact not found" });
    }

    return NextResponse.json({ ok: true, data: contact });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);
    const input = ContactUpdateInput.parse(await req.json());

    const updated = await withTenantDb(ctx.tenantId, async (tx) => {
      // Use updateMany to keep tenant scoping explicit.
      const res = await tx.contact.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
        },
      });

      if (res.count === 0) return null;
      return tx.contact.findFirst({ where: { id, tenantId: ctx.tenantId } });
    });

    if (!updated) {
      throw new ApiError({ status: 404, code: "not_found", message: "Contact not found" });
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
      const res = await tx.contact.deleteMany({
        where: { id, tenantId: ctx.tenantId },
      });
      if (res.count === 0) {
        throw new ApiError({ status: 404, code: "not_found", message: "Contact not found" });
      }
    });

    return NextResponse.json({ ok: true });
  });
}

