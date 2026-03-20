import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/auth/clerk";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { writeActivityEvent, writeAuditLog } from "@/lib/audit/auditLog";

const IdParam = z.object({ id: z.string().uuid() });

const TaskUpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.string().max(50).optional(),
  dueAt: z.coerce.date().optional(),
  assigneeClerkUserId: z.string().max(255).optional(),

  companyId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
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
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    const { id } = IdParam.parse(await params);

    const task = await withTenantDb(ctx.tenantId, async (tx) => {
      return tx.task.findFirst({ where: { id, tenantId: ctx.tenantId, organizationId } });
    });

    if (!task) throw new ApiError({ status: 404, code: "not_found", message: "Task not found" });
    return NextResponse.json({ ok: true, data: task });
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
    const input = TaskUpdateInput.parse(await req.json());

    const { requestId, ip, userAgent } = await getRequestContext();

    const updated = await withTenantDb(ctx.tenantId, async (tx) => {
      const res = await tx.task.updateMany({
        where: { id, tenantId: ctx.tenantId, organizationId },
        data: {
          title: input.title,
          status: input.status,
          dueAt: input.dueAt,
          assigneeClerkUserId: input.assigneeClerkUserId,
          companyId: input.companyId,
          contactId: input.contactId,
          dealId: input.dealId,
        },
      });

      if (res.count === 0) return null;

      const task = await tx.task.findFirst({
        where: { id, tenantId: ctx.tenantId, organizationId },
      });
      if (!task) return null;

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "task",
        entityId: task.id,
        action: "update",
        metadata: { input },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "task",
        entityId: task.id,
        action: "update",
        diff: { input },
        requestId,
        ip,
        userAgent,
      });

      return task;
    });

    if (!updated) throw new ApiError({ status: 404, code: "not_found", message: "Task not found" });
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
    const { requestId, ip, userAgent } = await getRequestContext();

    await withTenantDb(ctx.tenantId, async (tx) => {
      const existing = await tx.task.findFirst({
        where: { id, tenantId: ctx.tenantId, organizationId },
      });
      if (!existing) {
        throw new ApiError({ status: 404, code: "not_found", message: "Task not found" });
      }

      await tx.task.deleteMany({ where: { id, tenantId: ctx.tenantId, organizationId } });

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "task",
        entityId: existing.id,
        action: "delete",
        metadata: { task: existing },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "task",
        entityId: existing.id,
        action: "delete",
        diff: { task: existing },
        requestId,
        ip,
        userAgent,
      });
    });

    return NextResponse.json({ ok: true });
  });
}

