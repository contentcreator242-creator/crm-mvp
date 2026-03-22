import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { getTenantContext } from "@/lib/auth/clerk";
import { PageHeader } from "@/components/crm-shell";
import { createLeadActivity } from "@/lib/leads/activity";
import { markOnboardingFirstDeal } from "@/lib/onboarding/organizationChecklist";

const CreateDealInput = z.object({
  name: z.string().min(1).max(180),
  value: z.coerce.number().int().nonnegative().optional(),
  stage: z.enum(["new", "qualified", "won", "lost"]),
  leadId: z.string().uuid().optional(),
});

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { leadId } = await searchParams;

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const preselectedLead =
    leadId && z.string().uuid().safeParse(leadId).success
      ? await prisma.lead.findFirst({
          where: { id: leadId, organizationId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : null;

  const leads = await prisma.lead.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  async function createDeal(formData: FormData) {
    "use server";

    const ctx = await getTenantContext();

    const prisma = getPrisma();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);

    const parsed = CreateDealInput.parse({
      name: formData.get("name")?.toString()?.trim(),
      value: formData.get("value")?.toString()?.trim() || undefined,
      stage: formData.get("stage")?.toString() ?? "new",
      leadId: formData.get("leadId")?.toString() || undefined,
    });

    let safeLeadId: string | undefined = undefined;
    if (parsed.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.leadId, organizationId },
        select: { id: true },
      });
      if (lead) safeLeadId = lead.id;
    }

    const deal = await prisma.deal.create({
      data: {
        tenantId: ctx.tenantId,
        organizationId,
        // Backward-compatible linkage: existing Prisma clients always know contactId.
        contactId: safeLeadId,
        leadId: safeLeadId,
        // Keep legacy fields populated for existing API compatibility.
        title: parsed.name,
        status: parsed.stage,
        amountCents: parsed.value,
      },
    });

    if (safeLeadId) {
      await createLeadActivity(prisma, {
        organizationId,
        leadId: safeLeadId,
        dealId: deal.id,
        eventType: "deal_created",
        description: "Deal created from this lead.",
        metadata: { stage: parsed.stage },
      });
    }

    await markOnboardingFirstDeal(prisma, organizationId);

    redirect("/deals");
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader
        title="New deal"
        description="Create a deal and optionally link it to an existing lead."
        eyebrow="Pipeline"
        actions={
          <Link href="/deals" className="btn-secondary text-sm">
            Back
          </Link>
        }
      />

        <form action={createDeal} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-adm">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Name *
            </label>
            <input
              name="name"
              defaultValue={
                preselectedLead
                  ? `${preselectedLead.firstName} ${preselectedLead.lastName ?? ""}`.trim()
                  : ""
              }
              required
              className="adm-input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Value
            </label>
            <input
              name="value"
              type="number"
              min={0}
              placeholder="e.g. 25000"
              className="adm-input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Stage
            </label>
            <select
              name="stage"
              defaultValue="new"
              className="adm-input"
            >
              <option value="new">new</option>
              <option value="qualified">qualified</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Link to Lead
            </label>
            {preselectedLead ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {preselectedLead.firstName} {preselectedLead.lastName ?? ""}{" "}
                {preselectedLead.email ? `(${preselectedLead.email})` : ""}
                <input type="hidden" name="leadId" value={preselectedLead.id} />
              </div>
            ) : (
              <select
                name="leadId"
                defaultValue={leadId ?? ""}
                className="adm-input"
              >
                <option value="">No lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName ?? ""} {lead.email ? `(${lead.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button type="submit" className="btn-primary w-full">
            Create Deal
          </button>
        </form>
    </div>
  );
}

