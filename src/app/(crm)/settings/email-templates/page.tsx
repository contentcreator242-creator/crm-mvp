import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { listEmailTemplatesForOrganization } from "@/lib/email/emailTemplateQueries";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { DeleteEmailTemplateButton } from "./DeleteEmailTemplateButton";
import { deleteEmailTemplateAction } from "./emailTemplateActions";

export default async function EmailTemplatesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { e: err } = await searchParams;

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const templates = await listEmailTemplatesForOrganization(prisma, organizationId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Email templates"
        description="Workspace templates for lead emails. Scoped to this organization only."
        eyebrow="Settings"
        actions={
          <>
            <Link href="/settings/email" className="btn-secondary text-sm">
              Email / Reply-to
            </Link>
            <Link href="/settings/email-templates/new" className="adm-btn-primary text-sm">
              New template
            </Link>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
          </>
        }
      />

      {err ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {decodeURIComponent(err)}
        </div>
      ) : null}

      <ContentCard title="Templates" padding="md">
        {templates.length === 0 ? (
          <p className="text-sm text-slate-600">
            No custom templates yet.{" "}
            <Link href="/settings/email-templates/new" className="font-semibold text-slate-900 underline">
              Create one
            </Link>{" "}
            to use it from the lead email composer.
          </p>
        ) : (
          <div className="adm-table-wrap overflow-x-auto">
            <table className="adm-table min-w-full">
              <thead className="adm-thead">
                <tr>
                  <th className="adm-th">Name</th>
                  <th className="adm-th">Subject</th>
                  <th className="adm-th text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="adm-tr">
                    <td className="adm-td font-medium text-slate-900">{t.name}</td>
                    <td className="adm-td max-w-md truncate text-sm text-slate-700">{t.subject}</td>
                    <td className="adm-td text-right">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link
                          href={`/settings/email-templates/${t.id}/edit`}
                          className="text-sm font-semibold text-slate-800 underline decoration-slate-300 underline-offset-2"
                        >
                          Edit
                        </Link>
                        <DeleteEmailTemplateButton
                          action={deleteEmailTemplateAction}
                          templateId={t.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
    </div>
  );
}
