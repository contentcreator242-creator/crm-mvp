import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { saveOrganizationNameAction } from "./saveWorkspaceAction";

export default async function WorkspaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; e?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const sp = await searchParams;
  const saved = sp.saved === "1";
  const err = sp.e ? decodeURIComponent(sp.e) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Workspace"
        description="Organization name appears in the app, embed form header, and outbound emails. Reply-to is configured under Email."
        eyebrow="Settings"
        actions={
          <Link href="/dashboard" className="btn-secondary text-sm">
            Dashboard
          </Link>
        }
      />

      {saved ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Saved.
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {err}
        </div>
      ) : null}

      <ContentCard padding="md">
        <form action={saveOrganizationNameAction} className="space-y-4">
          <div>
            <label htmlFor="organizationName" className="crm-field-label">
              Organization name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              defaultValue={org?.name ?? ""}
              maxLength={120}
              className="adm-input mt-1"
              placeholder="Shown in the app, embed, and emails"
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave blank to clear the stored name (Clerk workspace slug may still appear after the next sync).
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="m-0 font-medium text-slate-800">Reply-to email</p>
            <p className="mt-1 mb-0 text-xs text-slate-600">
              Set your personal reply-to for lead emails in{" "}
              <Link href="/settings/email" className="font-medium text-blue-700 underline underline-offset-2">
                Settings → Email
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="adm-btn-primary text-sm">
              Save
            </button>
          </div>
        </form>
      </ContentCard>
    </div>
  );
}
