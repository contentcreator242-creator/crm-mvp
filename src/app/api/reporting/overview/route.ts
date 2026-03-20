import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/clerk";
import { withTenantDb } from "@/lib/db/tenantDb";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

export async function GET() {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();

    const data = await withTenantDb(ctx.tenantId, async (tx) => {
      const [contacts, companies, deals, tasks, notes, leads] = await Promise.all([
        tx.contact.count({ where: { tenantId: ctx.tenantId } }),
        tx.company.count({ where: { tenantId: ctx.tenantId } }),
        tx.deal.count({ where: { tenantId: ctx.tenantId } }),
        tx.task.count({ where: { tenantId: ctx.tenantId } }),
        tx.note.count({ where: { tenantId: ctx.tenantId } }),
        tx.leadSubmission.count({ where: { tenantId: ctx.tenantId } }),
      ]);

      return { contacts, companies, deals, tasks, notes, leads };
    });

    return NextResponse.json({ ok: true, data });
  });
}

