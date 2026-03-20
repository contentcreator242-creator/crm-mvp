import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { getEmailTemplateForOrganization } from "@/lib/email/emailTemplateQueries";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { updateEmailTemplateAction } from "../../emailTemplateActions";

export default async function EditEmailTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id } = await params;
  const { e: err } = await searchParams;

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const template = await getEmailTemplateForOrganization(prisma, organizationId, id);

  if (!template) {
    redirect("/settings/email-templates?e=" + encodeURIComponent("Template not found."));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit email template"
        description={template.name}
        eyebrow="Settings"
        actions={
          <Link href="/settings/email-templates" className="btn-secondary text-sm">
            Back
          </Link>
        }
      />

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {decodeURIComponent(err)}
        </div>
      ) : null}

      <ContentCard padding="md">
        <form action={updateEmailTemplateAction} className="space-y-4">
          <input type="hidden" name="templateId" value={template.id} />
          <div>
            <label htmlFor="tpl-name" className="crm-field-label">
              Name *
            </label>
            <input
              id="tpl-name"
              name="name"
              required
              maxLength={120}
              defaultValue={template.name}
              className="adm-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="tpl-subject" className="crm-field-label">
              Subject *
            </label>
            <input
              id="tpl-subject"
              name="subject"
              required
              maxLength={200}
              defaultValue={template.subject}
              className="adm-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="tpl-body" className="crm-field-label">
              Body *
            </label>
            <textarea
              id="tpl-body"
              name="body"
              required
              rows={14}
              defaultValue={template.body}
              className="adm-input mt-1 min-h-[200px]"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="adm-btn-primary text-sm">
              Save changes
            </button>
            <Link href="/settings/email-templates" className="btn-secondary text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </ContentCard>
    </div>
  );
}
