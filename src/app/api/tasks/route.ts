import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/auth/clerk";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { writeActivityEvent, writeAuditLog } from "@/lib/audit/auditLog";

const TaskCreateInput = z.object({
  title: z.string().min(1).max(200),
  status: z.string().max(50).optional(),
  dueAt: z.coerce.date().optional(),
  assigneeClerkUserId: z.string().max(255).optional(),

  companyId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);
    return NextResponse.json({
      ok: true,
      data: await withTenantDb(ctx.tenantId, async (tx) => {
        return tx.task.findMany({
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
    const input = TaskCreateInput.parse(await req.json());

    const h = await headers();
    const requestId = h.get("x-request-id");
    const ip = h.get("x-forwarded-for")?.split(",")?.[0]?.trim() ?? null;
    const userAgent = h.get("user-agent");

    const created = await withTenantDb(ctx.tenantId, async (tx) => {
      const task = await tx.task.create({
        data: {
          tenantId: ctx.tenantId,
          organizationId,
          title: input.title,
          status: input.status ?? "open",
          dueAt: input.dueAt,
          assigneeClerkUserId: input.assigneeClerkUserId,
          companyId: input.companyId,
          contactId: input.contactId,
          dealId: input.dealId,
        },
      });

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "task",
        entityId: task.id,
        action: "create",
        metadata: { input },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "task",
        entityId: task.id,
        action: "create",
        diff: { input },
        requestId,
        ip,
        userAgent,
      });

      return task;
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  });
}

