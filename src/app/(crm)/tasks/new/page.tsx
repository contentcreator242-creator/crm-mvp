import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { getTenantContext } from "@/lib/auth/clerk";
import { PageHeader } from "@/components/crm-shell";

const CreateTaskInput = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().optional(),
  status: z.enum(["todo", "done"]).default("todo"),
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; dealId?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const { leadId: leadIdParam, dealId: dealIdParam } = await searchParams;

  const [leads, deals] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deal.findMany({
      where: { organizationId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const safePreselectedLeadId = z.string().uuid().safeParse(leadIdParam).success
    ? leadIdParam
    : "";
  const safePreselectedDealId = z.string().uuid().safeParse(dealIdParam).success
    ? dealIdParam
    : "";

  async function createTask(formData: FormData) {
    "use server";

    const ctx = await getTenantContext();
    const prisma = getPrisma();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);

    const parsed = CreateTaskInput.parse({
      title: String(formData.get("title") || "").trim(),
      dueDate: String(formData.get("dueDate") || "").trim() || undefined,
      status: (String(formData.get("status") || "todo").trim() as "todo" | "done"),
      leadId: String(formData.get("leadId") || "").trim() || undefined,
      dealId: String(formData.get("dealId") || "").trim() || undefined,
    });

    let safeLeadId: string | undefined;
    if (parsed.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.leadId, organizationId },
        select: { id: true },
      });
      if (lead) safeLeadId = lead.id;
    }

    let safeDealId: string | undefined;
    if (parsed.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: parsed.dealId, organizationId },
        select: { id: true },
      });
      if (deal) safeDealId = deal.id;
    }

    await prisma.task.create({
      data: {
        tenantId: ctx.tenantId,
        organizationId,
        title: parsed.title,
        dueAt: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: parsed.status,
        // Backward-compatible lead link field in current Task model.
        contactId: safeLeadId,
        dealId: safeDealId,
      },
    });

    redirect("/tasks");
  }

  const fieldClass = "adm-input";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600";

  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="New task"
        description="Schedule follow-ups linked to leads or deals."
        eyebrow="Operations"
        actions={
          <Link href="/tasks" className="btn-secondary text-sm">
            Back
          </Link>
        }
      />

        <form action={createTask} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-adm">
          <div>
            <label className={labelClass}>Title</label>
            <input name="title" required className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>Due Date</label>
            <input name="dueDate" type="date" className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue="todo" className={fieldClass}>
              <option value="todo">todo</option>
              <option value="done">done</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Link Lead (optional)</label>
            <select name="leadId" defaultValue={safePreselectedLeadId} className={fieldClass}>
              <option value="">None</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.firstName} {lead.lastName ?? ""} {lead.email ? `(${lead.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Link Deal (optional)</label>
            <select name="dealId" defaultValue={safePreselectedDealId} className={fieldClass}>
              <option value="">None</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary w-full">
            Create Task
          </button>
        </form>
    </div>
  );
}

