import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { effectivePrimaryHex, getBrandingForOrganization } from "@/lib/settings/organizationBranding";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { saveBrandingAction } from "./saveBrandingAction";
import { BrandingLogoField } from "./BrandingLogoField";

export default async function BrandingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; e?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const branding = await getBrandingForOrganization(prisma, organizationId);

  const sp = await searchParams;
  const saved = sp.saved === "1";
  const err = sp.e ? decodeURIComponent(sp.e) : null;

  const primary = effectivePrimaryHex(branding?.primaryColorHex);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Branding"
        description="Company name, logo, and primary color for the embedded lead form and outbound emails."
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
          Branding saved.
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {err}
        </div>
      ) : null}

      <ContentCard padding="md">
        <form action={saveBrandingAction} className="space-y-4">
          <div>
            <label htmlFor="brandingCompanyName" className="crm-field-label">
              Company name
            </label>
            <input
              id="brandingCompanyName"
              name="brandingCompanyName"
              defaultValue={branding?.brandingCompanyName ?? ""}
              maxLength={120}
              className="adm-input mt-1"
              placeholder={branding?.organizationName ?? "Shown in emails and embed header"}
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave blank to use your workspace name from Clerk (
              {branding?.organizationName ?? "—"}).
            </p>
          </div>

          <BrandingLogoField initialUrl={branding?.logoUrl ?? ""} />

          <div>
            <label htmlFor="brandingPrimaryColorHex" className="crm-field-label">
              Primary color (hex)
            </label>
            <input
              id="brandingPrimaryColorHex"
              name="brandingPrimaryColorHex"
              defaultValue={primary}
              maxLength={7}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="adm-input mt-1 w-40 font-mono"
              placeholder="#2563EB"
            />
            <p className="mt-1 text-xs text-slate-500">Used for buttons and accents on the embedded form.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="adm-btn-primary text-sm">
              Save branding
            </button>
          </div>
        </form>
      </ContentCard>
    </div>
  );
}
