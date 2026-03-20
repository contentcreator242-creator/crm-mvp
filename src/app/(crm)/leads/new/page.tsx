import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { LeadCreateForm } from "./LeadCreateForm";
import { PageHeader } from "@/components/crm-shell";
import { leadWorkflowStatusSchema } from "@/lib/leads/leadWorkflowStatus";
import { createLeadActivity } from "@/lib/leads/activity";

const CreateLeadInput = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  companyName: z.string().max(180).optional(),
  status: leadWorkflowStatusSchema,
  notes: z.string().max(5000).optional(),
});

type CreateLeadFormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<"firstName" | "email", string>>;
};

async function createLead(
  _prevState: CreateLeadFormState,
  formData: FormData,
): Promise<CreateLeadFormState> {
  "use server";

  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const payload = {
    firstName: formData.get("firstName")?.toString()?.trim(),
    lastName: formData.get("lastName")?.toString()?.trim() || undefined,
    email: formData.get("email")?.toString()?.trim() || undefined,
    phone: formData.get("phone")?.toString()?.trim() || undefined,
    companyName: formData.get("companyName")?.toString()?.trim() || undefined,
    status: leadWorkflowStatusSchema.parse(formData.get("status")?.toString()?.trim() || "new"),
    notes: formData.get("notes")?.toString()?.trim() || undefined,
  };

  const parsed = CreateLeadInput.safeParse(payload);
  if (!parsed.success) {
    const errors: CreateLeadFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "firstName") errors.firstName = issue.message;
      if (field === "email") errors.email = issue.message;
    }
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors,
    };
  }

  const lead = await prisma.lead.create({
    data: {
      organizationId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      companyName: parsed.data.companyName,
      status: parsed.data.status,
      notes: parsed.data.notes,
    },
  });

  await createLeadActivity(prisma, {
    organizationId,
    leadId: lead.id,
    eventType: "lead_created",
    description: "Lead created in CRM.",
  });

  redirect("/leads?created=1");
}

export default async function NewLeadPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader
        title="New lead"
        description="Add a prospect to your active organization."
        eyebrow="Create"
        actions={
          <Link href="/leads" className="btn-secondary text-sm">
            Back to leads
          </Link>
        }
      />

      <LeadCreateForm action={createLead} />
    </div>
  );
}

