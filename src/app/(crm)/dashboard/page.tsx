import type { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { provisionOrganizationAfterUpsert } from "@/lib/auth/organization";
import {
  findLendersForOrganization,
  lenderSchemaIsFull,
} from "@/lib/lenders/lenderQueries";
import { DeleteLenderButton } from "@/app/(crm)/lenders/DeleteLenderButton";
import { deleteOrganizationLender } from "@/app/(crm)/lenders/deleteLenderAction";
import { crmStatusBadgeClass } from "@/lib/ui/crmBadges";
import {
  formatLeadStatusLabel,
  leadWorkflowBadgeClass,
} from "@/lib/leads/leadWorkflowStatus";
import { ContentCard, PageHeader, StatCard } from "@/components/crm-shell";

const recentLeadDashboardSelect = {
  id: true,
  firstName: true,
  lastName: true,
  status: true,
  createdAt: true,
} satisfies Prisma.LeadSelect;

type DashboardRecentLead = Prisma.LeadGetPayload<{ select: typeof recentLeadDashboardSelect }>;

function formatLeadCreatedDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function DashboardPage() {
  const { userId, orgId, orgSlug } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/organization/create");
  }

  const prisma = getPrisma();

  const organizationRow = await prisma.organization.upsert({
    where: { clerkOrganizationId: orgId },
    create: {
      clerkOrganizationId: orgId,
      name: orgSlug ?? null,
    },
    update: {
      name: orgSlug ?? undefined,
    },
    select: { id: true, name: true },
  });

  await provisionOrganizationAfterUpsert(organizationRow.id);

  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const endOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );

  const orgIdWhere = { organizationId: organizationRow.id };

  const [
    [
      totalLeads,
      totalDeals,
      dealsNew,
      dealsQualified,
      dealsWon,
      dealsLost,
      tasksDueToday,
      tasksOverdue,
      lenders,
      lendersSchemaFull,
    ],
    recentLeads,
  ] = await Promise.all([
    Promise.all([
      prisma.lead.count({ where: orgIdWhere }),
      prisma.deal.count({ where: orgIdWhere }),
      prisma.deal.count({
        where: {
          ...orgIdWhere,
          status: "new",
        },
      }),
      prisma.deal.count({
        where: {
          ...orgIdWhere,
          status: "qualified",
        },
      }),
      prisma.deal.count({
        where: {
          ...orgIdWhere,
          status: "won",
        },
      }),
      prisma.deal.count({
        where: {
          ...orgIdWhere,
          status: "lost",
        },
      }),
      prisma.task.count({
        where: {
          ...orgIdWhere,
          status: { not: "done" },
          dueAt: { gte: startOfTodayUtc, lte: endOfTodayUtc },
        },
      }),
      prisma.task.count({
        where: {
          ...orgIdWhere,
          status: { not: "done" },
          dueAt: { lt: startOfTodayUtc },
        },
      }),
      findLendersForOrganization(prisma, organizationRow.id),
      lenderSchemaIsFull(prisma),
    ]),
    prisma.lead.findMany({
      where: orgIdWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: recentLeadDashboardSelect,
    }),
  ]);

  const recentLeadsRows: DashboardRecentLead[] = recentLeads;

  const dealStageRows = [
    { key: "new" as const, count: dealsNew, label: "New" },
    { key: "qualified" as const, count: dealsQualified, label: "Qualified" },
    { key: "won" as const, count: dealsWon, label: "Won" },
    { key: "lost" as const, count: dealsLost, label: "Lost" },
  ];
  const dealMax = Math.max(1, ...dealStageRows.map((r) => r.count));

  return (
    <div className="adm-dashboard mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description={`${organizationRow.name ?? "Organization"} · metrics scoped to your active workspace.`}
        eyebrow="Overview"
        actions={
          <Link href="/deals/new" className="btn-secondary text-sm">
            New deal
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={totalLeads} tone="slate" hint="In pipeline" />
        <StatCard label="Open deals" value={totalDeals} tone="violet" hint="All stages" />
        <StatCard label="Tasks due today" value={tasksDueToday} tone="amber" hint="Incomplete" />
        <StatCard label="Overdue tasks" value={tasksOverdue} tone="rose" hint="Needs attention" />
      </div>

      <div className="mb-8">
        <ContentCard
          title="Recent leads"
          description="The five most recently created leads in this workspace."
          padding="none"
          headerExtra={
            <Link href="/leads" className="btn-secondary text-xs sm:text-sm">
              View all leads
            </Link>
          }
        >
          {recentLeadsRows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500 sm:px-6">No leads yet.</p>
          ) : (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="adm-table">
                <thead className="adm-thead">
                  <tr>
                    <th className="adm-th">Name</th>
                    <th className="adm-th">Status</th>
                    <th className="adm-th">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeadsRows.map((lead) => (
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
                        <Link href={`/leads/${lead.id}`} className="inline-flex hover:opacity-90">
                          <span className={leadWorkflowBadgeClass(lead.status)}>
                            {formatLeadStatusLabel(lead.status)}
                          </span>
                        </Link>
                      </td>
                      <td className="adm-td tabular-nums text-slate-700">
                        <Link href={`/leads/${lead.id}`} className="block hover:text-slate-900">
                          {formatLeadCreatedDate(lead.createdAt)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ContentCard title="Pipeline overview" description="Lead and deal volume at a glance." padding="md">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Leads</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{totalLeads}</p>
              <Link href="/leads" className="mt-3 inline-flex text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
                View leads →
              </Link>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Deals</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{totalDeals}</p>
              <Link href="/deals" className="mt-3 inline-flex text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
                View deals →
              </Link>
            </div>
          </div>
        </ContentCard>

        <ContentCard title="Deals by stage" description="Distribution across your deal pipeline." padding="md">
          <ul className="space-y-4">
            {dealStageRows.map(({ key, count, label }) => (
              <li key={key}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className={crmStatusBadgeClass(key)}>{label}</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900 transition-all"
                    style={{ width: `${(count / dealMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ContentCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ContentCard title="Tasks" description="Stay on top of follow-ups." padding="md">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800/80">Due today</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{tasksDueToday}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose-800/80">Overdue</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{tasksOverdue}</p>
            </div>
          </div>
          <Link
            href="/tasks"
            className="mt-4 inline-flex text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          >
            Open task list →
          </Link>
        </ContentCard>

        <ContentCard
          title="Lenders"
          description="Custom lenders can be removed here; defaults cannot be deleted."
          padding="md"
          headerExtra={
            <div className="flex flex-wrap gap-2">
              <Link href="/lenders/new" className="adm-btn-primary text-xs sm:text-sm">
                New lender
              </Link>
              <Link href="/lenders" className="btn-secondary text-xs sm:text-sm">
                Full list
              </Link>
            </div>
          }
        >
          {lenders.length === 0 ? (
            <p className="text-sm text-slate-500">No lenders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {lenders.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{l.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {!lendersSchemaFull ? (
                        "—"
                      ) : l.isDefaultSeeded ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-800">
                          Default
                        </span>
                      ) : (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-900">
                          Custom
                        </span>
                      )}{" "}
                      · {l.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link href={`/lenders/${l.id}/edit`} className="text-sm font-semibold text-slate-800 underline">
                      Edit
                    </Link>
                    {lendersSchemaFull && l.isDefaultSeeded ? (
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
                        redirectAfterDelete="/dashboard"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
