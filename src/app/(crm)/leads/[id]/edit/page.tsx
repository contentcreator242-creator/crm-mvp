import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import {
  LEAD_WORKFLOW_OPTIONS,
  leadWorkflowStatusSchema,
  normalizeLeadWorkflowStatus,
} from "@/lib/leads/leadWorkflowStatus";
import { PageHeader } from "@/components/crm-shell";
import { createLeadActivity } from "@/lib/leads/activity";

const UpdateLeadInput = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  companyName: z.string().max(180).optional(),
  status: leadWorkflowStatusSchema,
  notes: z.string().max(5000).optional(),
});

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id } = await params;
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId },
  });

  if (!lead) {
    redirect("/leads");
  }

  async function updateLead(formData: FormData) {
    "use server";

    const { userId, orgId, orgSlug } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/organization/create");

    const prisma = getPrisma();
    const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

    const statusRaw = formData.get("status")?.toString()?.trim();
    const parsed = UpdateLeadInput.parse({
      firstName: formData.get("firstName")?.toString()?.trim(),
      lastName: formData.get("lastName")?.toString()?.trim() || undefined,
      email: formData.get("email")?.toString()?.trim(),
      phone: formData.get("phone")?.toString()?.trim() || undefined,
      companyName: formData.get("companyName")?.toString()?.trim() || undefined,
      status: statusRaw ? leadWorkflowStatusSchema.parse(statusRaw) : "new",
      notes: formData.get("notes")?.toString()?.trim() || undefined,
    });

    const existing = await prisma.lead.findFirst({
      where: { id, organizationId },
      select: { status: true },
    });
    if (!existing) redirect("/leads");

    await prisma.lead.updateMany({
      where: {
        id,
        organizationId,
      },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone,
        companyName: parsed.companyName,
        status: parsed.status,
        notes: parsed.notes,
      },
    });

    if ((existing.status ?? "").toLowerCase() !== parsed.status.toLowerCase()) {
      await createLeadActivity(prisma, {
        organizationId,
        leadId: id,
        eventType: "status_changed",
        description: `Status changed from ${existing.status ?? "new"} to ${parsed.status}.`,
        metadata: { from: existing.status ?? null, to: parsed.status },
      });
    }

    redirect(`/leads/${id}`);
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader
        title="Edit lead"
        description="Update contact details and workflow status."
        eyebrow="Leads"
        actions={
          <Link href={`/leads/${id}`} className="btn-secondary text-sm">
            Back
          </Link>
        }
      />

        <form action={updateLead} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-adm">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
                First Name *
              </label>
              <input
                name="firstName"
                defaultValue={lead.firstName}
                required
                className="adm-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Last Name
              </label>
              <input
                name="lastName"
                defaultValue={lead.lastName ?? ""}
                className="adm-input"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Email *
              </label>
              <input
                name="email"
                type="email"
                defaultValue={lead.email ?? ""}
                required
                className="adm-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Phone
              </label>
              <input
                name="phone"
                defaultValue={lead.phone ?? ""}
                className="adm-input"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Company Name
              </label>
              <input
                name="companyName"
                defaultValue={lead.companyName ?? ""}
                className="adm-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Status
              </label>
              <select
                name="status"
                defaultValue={normalizeLeadWorkflowStatus(lead.status)}
                className="adm-input"
              >
                {LEAD_WORKFLOW_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Notes
            </label>
            <textarea
              name="notes"
              rows={7}
              defaultValue={lead.notes ?? ""}
              className="adm-input"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Save Changes
          </button>
        </form>
    </div>
  );
}

