import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createLenderForOrganization } from "@/lib/lenders/lenderQueries";
import {
  hasDuplicateLenderName,
  lenderFormRawSchema,
  validateAndCoerceLenderForm,
  zodIssuesSummary,
} from "@/lib/validation/lenderForm";
import { PageHeader } from "@/components/crm-shell";

export default async function NewLenderPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { e: errorParam } = await searchParams;
  const formError = errorParam ? decodeURIComponent(errorParam) : null;

  async function createLender(formData: FormData) {
    "use server";

    const { userId: uid, orgId: oid, orgSlug: slug } = await auth();
    if (!uid) redirect("/sign-in");
    if (!oid) redirect("/organization/create");

    const prismaInner = getPrisma();
    const orgIdInner = await resolveOrganizationId(oid, slug ?? null);

    const parsed = lenderFormRawSchema.safeParse({
      name: formData.get("name")?.toString(),
      isActive: formData.get("isActive")?.toString() === "false" ? "false" : "true",
      sourceUrl: formData.get("sourceUrl")?.toString()?.trim() || null,
      lastReviewedAt: null,
      criteriaConfidence: formData.get("criteriaConfidence")?.toString() || "",
      minAnnualRevenue: formData.get("minAnnualRevenue")?.toString(),
      minMonthlyRevenue: formData.get("minMonthlyRevenue")?.toString(),
      minTimeTradingMonths: formData.get("minTimeTradingMonths")?.toString(),
      minLoanAmount: formData.get("minLoanAmount")?.toString(),
      maxLoanAmount: formData.get("maxLoanAmount")?.toString(),
      acceptsAdverseCredit:
        formData.get("acceptsAdverseCredit")?.toString() === "true" ? "true" : "false",
      requiresPersonalGuarantee:
        formData.get("requiresPersonalGuarantee")?.toString() === "true" ? "true" : "false",
      maxLoanAsRevenueMultiple: formData.get("maxLoanAsRevenueMultiple")?.toString(),
      allowedIndustriesCsv: formData.get("allowedIndustriesCsv")?.toString(),
      excludedIndustriesCsv: formData.get("excludedIndustriesCsv")?.toString(),
      notes: formData.get("notes")?.toString() || null,
      allowDuplicateName:
        formData.get("allowDuplicateName")?.toString() === "true" ? "true" : undefined,
    });

    if (!parsed.success) {
      redirect(`/lenders/new?e=${encodeURIComponent(zodIssuesSummary(parsed.error))}`);
    }

    const coerced = validateAndCoerceLenderForm(parsed.data);
    if (!coerced.ok) {
      redirect(`/lenders/new?e=${encodeURIComponent(coerced.issues.join(" · "))}`);
    }

    const v = coerced.value;

    if (
      !v.allowDuplicateName &&
      (await hasDuplicateLenderName(prismaInner, orgIdInner, v.name))
    ) {
      redirect(
        `/lenders/new?e=${encodeURIComponent(
          "A lender with this name already exists in this organization. Enable “Allow duplicate name” to save anyway.",
        )}`,
      );
    }

    await createLenderForOrganization(prismaInner, orgIdInner, {
      name: v.name,
      isActive: v.isActive,
      sourceUrl: v.sourceUrl?.trim() || null,
      criteriaConfidence: v.criteriaConfidence,
      minAnnualRevenue: v.minAnnualRevenue,
      minMonthlyRevenue: v.minMonthlyRevenue,
      minTimeTradingMonths: v.minTimeTradingMonths,
      minLoanAmount: v.minLoanAmount,
      maxLoanAmount: v.maxLoanAmount,
      acceptsAdverseCredit: v.acceptsAdverseCredit,
      requiresPersonalGuarantee: v.requiresPersonalGuarantee,
      maxLoanAsRevenueMultiple: v.maxLoanAsRevenueMultiple,
      allowedIndustries: v.allowedIndustries,
      excludedIndustries: v.excludedIndustries,
      notes: v.notes?.trim() || null,
    });

    redirect("/lenders");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader
        title="New lender"
        description="Add custom matching criteria for your workspace. Active lenders are included in lead ranking."
        eyebrow="Matching"
        actions={
          <Link href="/lenders" className="btn-secondary text-sm">
            Back
          </Link>
        }
      />

        {formError ? (
          <div
            className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-adm"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <form action={createLender} className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-adm">
          <div>
            <label className="crm-field-label">Name *</label>
            <input name="name" required className="adm-input mt-1" />
          </div>
          <div className="flex items-start gap-2">
            <input
              id="allowDuplicateName"
              type="checkbox"
              name="allowDuplicateName"
              value="true"
              className="mt-1"
            />
            <label htmlFor="allowDuplicateName" className="text-sm text-slate-700">
              Allow duplicate name (another lender in this organization already uses the same name)
            </label>
          </div>
          <div>
            <label className="crm-field-label">Active</label>
            <select name="isActive" defaultValue="true" className="adm-input mt-1">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="crm-field-label">Source URL</label>
            <input name="sourceUrl" className="adm-input mt-1" />
          </div>
          <div>
            <label className="crm-field-label">Criteria confidence</label>
            <select name="criteriaConfidence" defaultValue="medium" className="adm-input mt-1">
              <option value="">—</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="crm-field-label">Min annual revenue (£)</label>
              <input name="minAnnualRevenue" type="number" min={0} step={1} className="adm-input mt-1" />
            </div>
            <div>
              <label className="crm-field-label">Min monthly revenue (£)</label>
              <input name="minMonthlyRevenue" type="number" min={0} step={1} className="adm-input mt-1" />
            </div>
            <div>
              <label className="crm-field-label">Min trading (months)</label>
              <input name="minTimeTradingMonths" type="number" min={0} step={1} className="adm-input mt-1" />
            </div>
            <div>
              <label className="crm-field-label">Max loan × revenue</label>
              <input name="maxLoanAsRevenueMultiple" type="number" min={0} step="any" className="adm-input mt-1" />
            </div>
            <div>
              <label className="crm-field-label">Min loan (£)</label>
              <input name="minLoanAmount" type="number" min={0} step={1} className="adm-input mt-1" />
            </div>
            <div>
              <label className="crm-field-label">Max loan (£)</label>
              <input name="maxLoanAmount" type="number" min={0} step={1} className="adm-input mt-1" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="crm-field-label">Accepts adverse credit</label>
              <select name="acceptsAdverseCredit" defaultValue="false" className="adm-input mt-1">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className="crm-field-label">Requires personal guarantee</label>
              <select name="requiresPersonalGuarantee" defaultValue="false" className="adm-input mt-1">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="crm-field-label">Allowed industries (comma-separated)</label>
            <textarea name="allowedIndustriesCsv" rows={2} className="adm-input mt-1" />
          </div>
          <div>
            <label className="crm-field-label">Excluded industries (comma-separated)</label>
            <textarea name="excludedIndustriesCsv" rows={2} className="adm-input mt-1" />
          </div>
          <div>
            <label className="crm-field-label">Notes</label>
            <textarea name="notes" rows={4} className="adm-input mt-1" />
          </div>
          <p className="text-xs text-slate-500">
            Saved as a <strong>user-created</strong> lender for this organization only. Industry lists are
            normalized (lowercase, deduplicated, sorted).
          </p>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Create lender
          </button>
        </form>
    </div>
  );
}
