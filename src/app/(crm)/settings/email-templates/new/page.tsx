import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { createEmailTemplateAction } from "../emailTemplateActions";

export default async function NewEmailTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { e: err } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New email template"
        description="Saved for this workspace only. Use {{firstName}} in subject or body to personalize."
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
        <form action={createEmailTemplateAction} className="space-y-4">
          <div>
            <label htmlFor="tpl-name" className="crm-field-label">
              Name *
            </label>
            <input
              id="tpl-name"
              name="name"
              required
              maxLength={120}
              className="adm-input mt-1"
              placeholder="e.g. Intro — asset finance"
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
              className="adm-input mt-1"
              placeholder="Email subject line"
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
              className="adm-input mt-1 min-h-[200px]"
              placeholder="Message body…"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="adm-btn-primary text-sm">
              Save template
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
