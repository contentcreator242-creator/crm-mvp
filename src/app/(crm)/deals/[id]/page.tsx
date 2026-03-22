import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { DealSubmissionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { crmStatusBadgeClass } from "@/lib/ui/crmBadges";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { DealLenderSubmissionsPanel } from "./DealLenderSubmissionsPanel";

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function DealDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id } = await params;
  const dealId = id;
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    include: {
      lender: { select: { id: true, name: true } },
      dealLenderSubmissions: {
        include: {
          lender: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!deal) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-adm">
          <p className="text-slate-700">Deal not found.</p>
          <Link href="/deals" className="btn-secondary mt-6 inline-flex">
            Back to deals
          </Link>
        </div>
      </div>
    );
  }

  const leadNavId = deal.leadId ?? deal.contactId;

  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      dealId,
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  const hasJoinRows = deal.dealLenderSubmissions.length > 0;
  const legacyLenderName =
    !hasJoinRows && deal.lender?.name ? deal.lender.name : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={String(deal.name || deal.title)}
        description="Deal record, lender tracking, and related tasks."
        eyebrow="Deal"
        actions={
          <Link href="/deals" className="btn-secondary text-sm">
            All deals
          </Link>
        }
      />

      <ContentCard title="Lender applications" padding="md">
        <DealLenderSubmissionsPanel
          submissions={deal.dealLenderSubmissions.map((s) => ({
            id: s.id,
            status: s.status,
            submittedAt: s.submittedAt,
            decisionAt: s.decisionAt,
            notes: s.notes,
            lender: s.lender,
          }))}
          legacyLenderName={legacyLenderName}
          legacySubmissionStatus={deal.submissionStatus as DealSubmissionStatus}
          legacySubmissionDate={deal.submissionDate}
        />
      </ContentCard>

      <ContentCard title="Summary" padding="md">
        <div className="space-y-4 text-sm">
          <div>
            <p className="crm-field-label">Pipeline status</p>
            <p className="mt-1.5">
              <span className={crmStatusBadgeClass(String(deal.stage || deal.status || "new"))}>
                {deal.stage || deal.status}
              </span>
            </p>
          </div>
          <div>
            <p className="crm-field-label">Value</p>
            <p className="crm-field-value mt-1.5 text-base tabular-nums">
              {formatCurrency(
                typeof deal.value === "number"
                  ? deal.value
                  : typeof deal.amountCents === "number"
                    ? deal.amountCents
                    : undefined,
              )}
            </p>
          </div>
          <div>
            <p className="crm-field-label">Created</p>
            <p className="crm-field-value mt-1.5 tabular-nums font-normal text-slate-800">
              {formatDate(deal.createdAt)}
            </p>
          </div>
          {leadNavId ? (
            <div>
              <p className="crm-field-label">Lead</p>
              <p className="mt-1.5">
                <Link href={`/leads/${leadNavId}`} className="font-medium text-blue-700 underline underline-offset-2">
                  Open lead
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </ContentCard>

      <ContentCard
        title="Tasks"
        padding="md"
        headerExtra={
          <Link href={`/tasks/new?dealId=${dealId}`} className="btn-secondary-sm">
            Add task
          </Link>
        }
      >
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks linked to this deal.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm shadow-sm"
              >
                <span className="font-semibold text-slate-900">{task.title}</span>
                <span className={`ml-2 ${crmStatusBadgeClass(task.status)}`}>{task.status}</span>
              </li>
            ))}
          </ul>
        )}
      </ContentCard>
    </div>
  );
}
