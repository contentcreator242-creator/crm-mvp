import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import {
  formatLeadStatusLabel,
  leadWorkflowBadgeClass,
} from "@/lib/leads/leadWorkflowStatus";
import { formatUsdWhole, leadSourceSummary } from "@/lib/ui/leadDisplay";
import { PageHeader } from "@/components/crm-shell";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  const { created } = await searchParams;

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const leads = await prisma.lead.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      captureSubmissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { leadSource: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Leads"
        description="Prospects and inbound capture for your active organization."
        eyebrow="Pipeline"
        actions={
          <>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
            <Link href="/leads/new" className="adm-btn-primary text-sm">
              New lead
            </Link>
          </>
        }
      />

      {created === "1" ? (
        <div className="mb-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900 shadow-adm">
          Lead created successfully.
        </div>
      ) : null}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead className="adm-thead">
            <tr>
              <th className="adm-th">Full name</th>
              <th className="adm-th">Company</th>
              <th className="adm-th">Email</th>
              <th className="adm-th">Source</th>
              <th className="adm-th">Requested</th>
              <th className="adm-th">Status</th>
              <th className="adm-th">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr className="adm-tr">
                <td className="adm-td py-12 text-center text-slate-500" colSpan={7}>
                  No leads yet. Create your first lead.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="adm-tr">
                  <td className="adm-td">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="block font-semibold text-slate-900 hover:text-slate-600"
                    >
                      {lead.firstName} {lead.lastName ?? ""}
                    </Link>
                  </td>
                  <td className="adm-td">
                    <Link href={`/leads/${lead.id}`} className="block text-slate-700 hover:text-slate-900">
                      {lead.companyName ?? "—"}
                    </Link>
                  </td>
                  <td className="adm-td">
                    <Link href={`/leads/${lead.id}`} className="block text-slate-700 hover:text-slate-900">
                      {lead.email ?? "—"}
                    </Link>
                  </td>
                  <td className="adm-td">
                    <Link href={`/leads/${lead.id}`} className="block text-slate-700 hover:text-slate-900">
                      <span
                        className={
                          lead.captureSubmissions.length > 0
                            ? "rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900"
                            : "rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                        }
                      >
                        {leadSourceSummary(lead.captureSubmissions)}
                      </span>
                    </Link>
                  </td>
                  <td className="adm-td">
                    <Link href={`/leads/${lead.id}`} className="block tabular-nums text-slate-800 hover:text-slate-900">
                      {formatUsdWhole(lead.requestedAmount)}
                    </Link>
                  </td>
                  <td className="adm-td">
                    <Link href={`/leads/${lead.id}`} className="inline-flex hover:opacity-90">
                      <span className={leadWorkflowBadgeClass(lead.status)}>{formatLeadStatusLabel(lead.status)}</span>
                    </Link>
                  </td>
                  <td className="adm-td tabular-nums text-slate-700">
                    <Link href={`/leads/${lead.id}`} className="block hover:text-slate-900">
                      {formatDate(lead.createdAt)}
                    </Link>
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
