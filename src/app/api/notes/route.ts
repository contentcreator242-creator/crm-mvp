import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { writeActivityEvent, writeAuditLog } from "@/lib/audit/auditLog";

const NoteCreateInput = z.object({
  content: z.string().min(1).max(5000),
  refType: z.string().max(100).optional(),
  refId: z.string().uuid().optional(),
});

export async function GET() {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();

    return NextResponse.json({
      ok: true,
      data: await withTenantDb(ctx.tenantId, async (tx) => {
        return tx.note.findMany({
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
    const input = NoteCreateInput.parse(await req.json());

    const h = await headers();
    const requestId = h.get("x-request-id");
    const ip = h.get("x-forwarded-for")?.split(",")?.[0]?.trim() ?? null;
    const userAgent = h.get("user-agent");

    const created = await withTenantDb(ctx.tenantId, async (tx) => {
      const note = await tx.note.create({
        data: {
          tenantId: ctx.tenantId,
          content: input.content,
          refType: input.refType,
          refId: input.refId,
        },
      });

      await writeActivityEvent(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "note",
        entityId: note.id,
        action: "create",
        metadata: { input },
      });

      await writeAuditLog(tx, {
        tenantId: ctx.tenantId,
        actorClerkUserId: ctx.clerkUserId,
        entityType: "note",
        entityId: note.id,
        action: "create",
        diff: { input },
        requestId,
        ip,
        userAgent,
      });

      return note;
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  });
}

