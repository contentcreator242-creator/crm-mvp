import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import {
  deleteCustomLenderForOrganization,
  findLenderByIdForOrganization,
  lenderSchemaIsFull,
  updateLenderLegacyMvpColumns,
} from "@/lib/lenders/lenderQueries";
import {
  hasDuplicateLenderName,
  lenderFormRawSchema,
  validateAndCoerceLenderForm,
  zodIssuesSummary,
} from "@/lib/validation/lenderForm";
import { DeleteLenderButton } from "@/app/(crm)/lenders/DeleteLenderButton";
import { PageHeader } from "@/components/crm-shell";

function dateOrNull(s: string | null | undefined): Date | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function EditLenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id: lenderId } = await params;
  const { e: errorParam } = await searchParams;
  const formError = errorParam ? decodeURIComponent(errorParam) : null;

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const lender = await findLenderByIdForOrganization(prisma, organizationId, lenderId);

  if (!lender) {
    redirect("/lenders");
  }

  const schemaFull = await lenderSchemaIsFull(prisma);
  const canDeleteCustom = schemaFull && !lender.isDefaultSeeded;

  const allowedStr = Array.isArray(lender.allowedIndustries)
    ? (lender.allowedIndustries as string[]).join(", ")
    : "";
  const excludedStr = Array.isArray(lender.excludedIndustries)
    ? (lender.excludedIndustries as string[]).join(", ")
    : "";

  async function updateLender(formData: FormData) {
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
      lastReviewedAt: formData.get("lastReviewedAt")?.toString() || null,
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
      redirect(
        `/lenders/${lenderId}/edit?e=${encodeURIComponent(zodIssuesSummary(parsed.error))}`,
      );
    }

    const coerced = validateAndCoerceLenderForm(parsed.data);
    if (!coerced.ok) {
      redirect(`/lenders/${lenderId}/edit?e=${encodeURIComponent(coerced.issues.join(" · "))}`);
    }

    const v = coerced.value;

    if (
      !v.allowDuplicateName &&
      (await hasDuplicateLenderName(prismaInner, orgIdInner, v.name, lenderId))
    ) {
      redirect(
        `/lenders/${lenderId}/edit?e=${encodeURIComponent(
          "A lender with this name already exists in this organization. Enable “Allow duplicate name” to save anyway.",
        )}`,
      );
    }

    if (await lenderSchemaIsFull(prismaInner)) {
      await prismaInner.lender.updateMany({
        where: { id: lenderId, organizationId: orgIdInner },
        data: {
          name: v.name,
          isActive: v.isActive,
          sourceUrl: v.sourceUrl?.trim() || null,
          lastReviewedAt: dateOrNull(parsed.data.lastReviewedAt),
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
          isUserModified: true,
        },
      });
    } else {
      await updateLenderLegacyMvpColumns(prismaInner, orgIdInner, lenderId, {
        name: v.name,
        minAnnualRevenue: v.minAnnualRevenue,
        minTimeTradingMonths: v.minTimeTradingMonths,
        minLoanAmount: v.minLoanAmount,
        maxLoanAmount: v.maxLoanAmount,
        acceptsAdverseCredit: v.acceptsAdverseCredit,
        allowedIndustries: v.allowedIndustries,
        excludedIndustries: v.excludedIndustries,
      });
    }

    redirect("/lenders");
  }

  async function deleteLender() {
    "use server";

    const { userId: uid, orgId: oid, orgSlug: slug } = await auth();
    if (!uid) redirect("/sign-in");
    if (!oid) redirect("/organization/create");

    const prismaInner = getPrisma();
    const orgIdInner = await resolveOrganizationId(oid, slug ?? null);

    await deleteCustomLenderForOrganization(prismaInner, orgIdInner, lenderId);

    revalidatePath("/lenders");
    revalidatePath("/dashboard");

    redirect("/lenders");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader
        title="Edit lender"
        description={
          lender.isDefaultSeeded
            ? `${lender.name} — default workspace template (cannot delete here).`
            : `${lender.name} — user-created for your organization.`
        }
        eyebrow="Matching"
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Link href="/lenders" className="btn-secondary text-sm">
              Back
            </Link>
            {canDeleteCustom ? <DeleteLenderButton action={deleteLender} /> : null}
          </div>
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

        <form action={updateLender} className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-adm">
          <div>
            <label className="crm-field-label">Name *</label>
            <input name="name" required defaultValue={lender.name} className="adm-input mt-1" />
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
            <select name="isActive" defaultValue={lender.isActive ? "true" : "false"} className="adm-input mt-1">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="crm-field-label">Source URL</label>
            <input name="sourceUrl" defaultValue={lender.sourceUrl ?? ""} className="adm-input mt-1" />
          </div>
          <div>
            <label className="crm-field-label">Last reviewed (ISO date/time)</label>
            <input
              name="lastReviewedAt"
              type="datetime-local"
              defaultValue={
                lender.lastReviewedAt
                  ? new Date(lender.lastReviewedAt.getTime() - lender.lastReviewedAt.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              className="adm-input mt-1"
            />
          </div>
          <div>
            <label className="crm-field-label">Criteria confidence</label>
            <select
              name="criteriaConfidence"
              defaultValue={lender.criteriaConfidence ?? ""}
              className="adm-input mt-1"
            >
              <option value="">—</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="crm-field-label">Min annual revenue (£)</label>
              <input
                name="minAnnualRevenue"
                type="number"
                min={0}
                step={1}
                defaultValue={lender.minAnnualRevenue ?? ""}
                className="adm-input mt-1"
              />
            </div>
            <div>
              <label className="crm-field-label">Min monthly revenue (£)</label>
              <input
                name="minMonthlyRevenue"
                type="number"
                min={0}
                step={1}
                defaultValue={lender.minMonthlyRevenue ?? ""}
                className="adm-input mt-1"
              />
            </div>
            <div>
              <label className="crm-field-label">Min trading (months)</label>
              <input
                name="minTimeTradingMonths"
                type="number"
                min={0}
                step={1}
                defaultValue={lender.minTimeTradingMonths ?? ""}
                className="adm-input mt-1"
              />
            </div>
            <div>
              <label className="crm-field-label">Max loan × revenue</label>
              <input
                name="maxLoanAsRevenueMultiple"
                type="number"
                min={0}
                step="any"
                defaultValue={lender.maxLoanAsRevenueMultiple ?? ""}
                className="adm-input mt-1"
              />
            </div>
            <div>
              <label className="crm-field-label">Min loan (£)</label>
              <input
                name="minLoanAmount"
                type="number"
                min={0}
                step={1}
                defaultValue={lender.minLoanAmount ?? ""}
                className="adm-input mt-1"
              />
            </div>
            <div>
              <label className="crm-field-label">Max loan (£)</label>
              <input
                name="maxLoanAmount"
                type="number"
                min={0}
                step={1}
                defaultValue={lender.maxLoanAmount ?? ""}
                className="adm-input mt-1"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="crm-field-label">Accepts adverse credit</label>
              <select
                name="acceptsAdverseCredit"
                defaultValue={lender.acceptsAdverseCredit ? "true" : "false"}
                className="adm-input mt-1"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className="crm-field-label">Requires personal guarantee</label>
              <select
                name="requiresPersonalGuarantee"
                defaultValue={lender.requiresPersonalGuarantee ? "true" : "false"}
                className="adm-input mt-1"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="crm-field-label">Allowed industries (comma-separated)</label>
            <textarea name="allowedIndustriesCsv" rows={2} defaultValue={allowedStr} className="adm-input mt-1" />
          </div>
          <div>
            <label className="crm-field-label">Excluded industries (comma-separated)</label>
            <textarea name="excludedIndustriesCsv" rows={2} defaultValue={excludedStr} className="adm-input mt-1" />
          </div>
          <div>
            <label className="crm-field-label">Notes</label>
            <textarea name="notes" rows={4} defaultValue={lender.notes ?? ""} className="adm-input mt-1" />
          </div>
          <p className="text-xs text-slate-500">
            Industry lists are saved consistently: lowercase, deduplicated, and sorted.
          </p>
          {lender.isDefaultSeeded ? (
            <p className="text-xs text-slate-500">
              Default-seeded lender — your edits are tracked (`isUserModified`).
            </p>
          ) : !schemaFull ? (
            <p className="text-xs text-amber-800">
              Database schema is missing extended columns; delete custom lenders is unavailable until you
              run migrations.
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Save
          </button>
        </form>
    </div>
  );
}
