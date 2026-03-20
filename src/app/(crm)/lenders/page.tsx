import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { findLendersForOrganization, lenderSchemaIsFull } from "@/lib/lenders/lenderQueries";
import { DeleteLenderButton } from "@/app/(crm)/lenders/DeleteLenderButton";
import { deleteOrganizationLender } from "@/app/(crm)/lenders/deleteLenderAction";
import { PageHeader } from "@/components/crm-shell";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

export default async function LendersPage() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const [lenders, schemaFull] = await Promise.all([
    findLendersForOrganization(prisma, organizationId),
    lenderSchemaIsFull(prisma),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Lenders"
        description="Criteria used for lead matching. Only active lenders are included in rank results."
        eyebrow="Matching"
        actions={
          <>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
            <Link href="/lenders/new" className="adm-btn-primary text-sm">
              New lender
            </Link>
          </>
        }
      />

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead className="adm-thead">
            <tr>
              <th className="adm-th">Name</th>
              <th className="adm-th">Origin</th>
              <th className="adm-th">Active</th>
              <th className="adm-th">Source</th>
              <th className="adm-th">Last reviewed</th>
              <th className="adm-th">Confidence</th>
              <th className="adm-th"> </th>
            </tr>
          </thead>
          <tbody>
            {lenders.length === 0 ? (
              <tr className="adm-tr">
                <td className="adm-td py-12 text-center text-slate-500" colSpan={7}>
                  No lenders yet.
                </td>
              </tr>
            ) : (
              lenders.map((l) => (
                <tr key={l.id} className="adm-tr">
                  <td className="adm-td font-semibold text-slate-900">{l.name}</td>
                  <td className="adm-td text-sm">
                    {!schemaFull ? (
                      <span className="text-slate-400">—</span>
                    ) : l.isDefaultSeeded ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
                        Default
                      </span>
                    ) : (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="adm-td">{l.isActive ? "Yes" : "No"}</td>
                  <td className="adm-td">
                    {l.sourceUrl ? (
                      <a
                        href={l.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm font-medium text-slate-700 underline"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="adm-td tabular-nums text-sm">{formatDate(l.lastReviewedAt)}</td>
                  <td className="adm-td text-sm">{l.criteriaConfidence ?? "—"}</td>
                  <td className="adm-td">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <Link
                        href={`/lenders/${l.id}/edit`}
                        className="text-sm font-semibold text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                      >
                        Edit
                      </Link>
                      {schemaFull && l.isDefaultSeeded ? (
                        <span
                          className="inline-flex cursor-not-allowed text-sm font-semibold text-slate-400"
                          title="Default workspace lenders cannot be deleted. Deactivate them or add a custom lender instead."
                        >
                          Delete
                        </span>
                      ) : (
                        <DeleteLenderButton
                          action={deleteOrganizationLender}
                          lenderId={l.id}
                          submitLabel="Delete"
                          redirectAfterDelete="/lenders"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
