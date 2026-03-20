import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { writeActivityEvent, writeAuditLog } from "@/lib/audit/auditLog";

const IdParam = z.object({ id: z.string().uuid() });

const NoteUpdateInput = z.object({
  content: z.string().min(1).max(5000).optional(),
  refType: z.string().max(100).optional(),
  refId: z.string().uuid().optional().nullable(),
});

async function getRequestContext() {
  const h = await headers();
  const requestId = h.get("x-request-id");
  const ip = h.get("x-forwarded-for")?.split(",")?.[0]?.trim() ?? null;
  const userAgent = h.get("user-agent");
  return { requestId, ip, userAgent };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);

    const note = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.note.findFirst({ where: { id, tenantId: ctx.tenantId } });
    });

    if (!note) throw new ApiError({ status: 404, code: "not_found", message: "Note not found" });
    return NextResponse.json({ ok: true, data: note });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const { id } = IdParam.parse(await params);
    const input = NoteUpdateInput.parse(await req.json());

    const { requestId, ip, userAgent } = await getRequestContext();

    const updated = await withTenantDb(ctx.tenantId, async (tx) => {
      const res = await tx.note.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data: {
          content: input.content,
          refType: input.refType,
          refId: input.refId,
        },
      });

      if (res.count === 0) return null;

      const note = await tx.note.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!note) return null;

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "note",
        entityId: note.id,
        action: "update",
        metadata: { input },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "note",
        entityId: note.id,
        action: "update",
        diff: { input },
        requestId,
        ip,
        userAgent,
      });

      return note;
    });

    if (!updated) throw new ApiError({ status: 404, code: "not_found", message: "Note not found" });
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
    const { requestId, ip, userAgent } = await getRequestContext();

    await withTenantDb(ctx.tenantId, async (tx) => {
      const existing = await tx.note.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) {
        throw new ApiError({ status: 404, code: "not_found", message: "Note not found" });
      }

      await tx.note.deleteMany({ where: { id, tenantId: ctx.tenantId } });

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "note",
        entityId: existing.id,
        action: "delete",
        metadata: { note: existing },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "note",
        entityId: existing.id,
        action: "delete",
        diff: { note: existing },
        requestId,
        ip,
        userAgent,
      });
    });

    return NextResponse.json({ ok: true });
  });
}

