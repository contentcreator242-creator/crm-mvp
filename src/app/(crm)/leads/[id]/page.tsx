import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { withTenantDb } from "@/lib/db/tenantDb";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { DeleteLeadButton } from "./DeleteLeadButton";
import { SendLeadEmailModal } from "./SendLeadEmailModal";
import { leadWorkflowStatusSchema } from "@/lib/leads/leadWorkflowStatus";
import { LeadWorkflowPanel } from "@/components/leads/LeadWorkflowPanel";
import { crmStatusBadgeClass } from "@/lib/ui/crmBadges";
import {
  formatCreditIssues,
  formatUsdWhole,
  leadSourceSummary,
} from "@/lib/ui/leadDisplay";
import {
  buildLenderMatchDisplayRows,
  groupDisplayRowsByTier,
} from "@/lib/ui/lenderMatchDisplay";
import { LenderMatchSection } from "./LenderMatchSection";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import {
  createLeadActivity,
  formatLeadActivityType,
  listLeadActivities,
} from "@/lib/leads/activity";
import { createLeadNote, listLeadNotes } from "@/lib/leads/notes";
import {
  getMemberReplyToEmail,
  resolveReplyToForSend,
} from "@/lib/settings/memberReplyToEmail";
import { parseEmailSentFromActivity } from "@/lib/leads/emailSentActivity";
import { listEmailTemplatesForOrganization } from "@/lib/email/emailTemplateQueries";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export default async function LeadDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id } = await params;
  const leadId = id;
  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      captureSubmissions: {
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          leadSource: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!lead) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-adm">
          <p className="text-slate-700">Lead not found.</p>
          <Link href="/leads" className="btn-secondary mt-6 inline-flex">
            Back to leads
          </Link>
        </div>
      </div>
    );
  }

  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      contactId: leadId,
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  const leadActivities = await listLeadActivities(prisma, {
    leadId,
    organizationId,
    take: 50,
  });

  const leadNotes = await listLeadNotes(prisma, {
    leadId,
    organizationId,
    take: 200,
  });

  const memberReplyTo = await getMemberReplyToEmail(prisma, organizationId, userId);
  const resolvedReplyTo = resolveReplyToForSend(memberReplyTo, process.env.EMAIL_REPLY_TO);

  const sentEmails = leadActivities.filter((e) => e.eventType === "email_sent");

  const emailTemplatesForComposer = await listEmailTemplatesForOrganization(prisma, organizationId);

  // Align with API routes: ensure a tenant row exists for this Clerk org (not only after first embed).
  const tenant = await prisma.tenant.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, isBeta: false },
    update: {},
    select: { id: true },
  });

  const latestLenderMatch = await withTenantDb(tenant.id, async (tx) =>
    tx.lenderMatch.findFirst({
      where: {
        tenantId: tenant.id,
        leadId: lead.id,
        OR: [{ organizationId: lead.organizationId }, { organizationId: null }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        explanations: { orderBy: { rank: "asc" } },
      },
    }),
  );

  type StoredRanked = {
    lenderName: string;
    rank: number;
    score: number | null;
    explanation: string | null;
  };
  const resultsPayload = latestLenderMatch?.results as
    | { rankedResults?: StoredRanked[] }
    | null
    | undefined;
  const fallbackRanked: StoredRanked[] = Array.isArray(resultsPayload?.rankedResults)
    ? resultsPayload.rankedResults
    : [];
  const rawRows =
    latestLenderMatch != null && latestLenderMatch.explanations.length > 0
      ? latestLenderMatch.explanations.map((row) => ({
          key: row.id,
          rank: row.rank,
          lenderName: row.lenderName,
          score: row.score,
          explanation: row.explanation,
        }))
      : fallbackRanked.map((row, i) => ({
          key: `json-${row.rank}-${i}-${row.lenderName}`,
          rank: row.rank ?? i + 1,
          lenderName: row.lenderName,
          score: row.score,
          explanation: row.explanation,
        }));

  const displayRows = buildLenderMatchDisplayRows(rawRows);
  const { good: goodMatches, borderline: borderlineMatches, failed: failedMatches } =
    groupDisplayRowsByTier(displayRows);

  async function deleteLead() {
    "use server";

    const { userId, orgId, orgSlug } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/organization/create");

    const prisma = getPrisma();
    const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

    await prisma.lead.deleteMany({
      where: {
        id: leadId,
        organizationId,
      },
    });

    redirect("/leads");
  }

  async function updateLeadWorkflowStatus(formData: FormData) {
    "use server";

    const { userId, orgId, orgSlug } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/organization/create");

    const prismaInner = getPrisma();
    const organizationIdInner = await resolveOrganizationId(orgId, orgSlug ?? null);

    const parsed = leadWorkflowStatusSchema.safeParse(
      formData.get("workflowStatus")?.toString()?.trim(),
    );
    if (!parsed.success) redirect(`/leads/${leadId}`);

    const existing = await prismaInner.lead.findFirst({
      where: { id: leadId, organizationId: organizationIdInner },
      select: { status: true },
    });
    if (!existing) redirect("/leads");

    await prismaInner.lead.updateMany({
      where: { id: leadId, organizationId: organizationIdInner },
      data: { status: parsed.data },
    });

    if ((existing.status ?? "").toLowerCase() !== parsed.data.toLowerCase()) {
      await createLeadActivity(prismaInner, {
        organizationId: organizationIdInner,
        leadId,
        eventType: "status_changed",
        description: `Status changed from ${existing.status ?? "new"} to ${parsed.data}.`,
        metadata: { from: existing.status ?? null, to: parsed.data },
      });
    }

    redirect(`/leads/${leadId}`);
  }

  async function addNote(formData: FormData) {
    "use server";

    const { userId, orgId, orgSlug } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/organization/create");

    const prismaInner = getPrisma();
    const organizationIdInner = await resolveOrganizationId(orgId, orgSlug ?? null);

    const content = formData.get("content")?.toString()?.trim() ?? "";
    if (!content) redirect(`/leads/${leadId}`);

    await createLeadNote(prismaInner, {
      organizationId: organizationIdInner,
      leadId,
      content,
    });

    await createLeadActivity(prismaInner, {
      organizationId: organizationIdInner,
      leadId,
      eventType: "note",
      description: `Note added: ${content.length > 120 ? `${content.slice(0, 120)}...` : content}`,
    });

    redirect(`/leads/${leadId}`);
  }

  async function takeLenderAction(formData: FormData) {
    "use server";

    const { userId, orgId, orgSlug } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/organization/create");

    const prismaInner = getPrisma();
    const organizationIdInner = await resolveOrganizationId(orgId, orgSlug ?? null);
    const lenderName = formData.get("lenderName")?.toString()?.trim() ?? "";
    const actionType = formData.get("actionType")?.toString()?.trim();
    if (!lenderName) redirect(`/leads/${leadId}`);
    if (actionType !== "proceed" && actionType !== "submitted") redirect(`/leads/${leadId}`);

    const leadRow = await prismaInner.lead.findFirst({
      where: { id: leadId, organizationId: organizationIdInner },
      select: { id: true, firstName: true, lastName: true, status: true },
    });
    if (!leadRow) redirect("/leads");

    const nextLeadStatus = actionType === "submitted" ? "submitted" : "in_progress";
    if ((leadRow.status ?? "").toLowerCase() !== nextLeadStatus) {
      await prismaInner.lead.updateMany({
        where: { id: leadId, organizationId: organizationIdInner },
        data: { status: nextLeadStatus },
      });
      await createLeadActivity(prismaInner, {
        organizationId: organizationIdInner,
        leadId,
        eventType: "status_changed",
        description: `Status changed from ${leadRow.status ?? "new"} to ${nextLeadStatus}.`,
        metadata: { from: leadRow.status ?? null, to: nextLeadStatus },
      });
    }

    const tenantRow = await prismaInner.tenant.upsert({
      where: { clerkOrgId: orgId },
      create: { clerkOrgId: orgId, isBeta: false },
      update: {},
      select: { id: true },
    });

    const dealTitle = `Lender application: ${lenderName}`;
    const existingDeal = await prismaInner.deal.findFirst({
      where: { organizationId: organizationIdInner, contactId: leadId, title: dealTitle },
      select: { id: true },
    });
    const deal =
      existingDeal ??
      (await prismaInner.deal.create({
        data: {
          tenantId: tenantRow.id,
          organizationId: organizationIdInner,
          contactId: leadId,
          title: dealTitle,
          status: actionType === "submitted" ? "qualified" : "new",
          name: `${leadRow.firstName} ${leadRow.lastName ?? ""}`.trim(),
          stage: actionType === "submitted" ? "qualified" : "new",
        },
        select: { id: true },
      }));

    await createLeadActivity(prismaInner, {
      organizationId: organizationIdInner,
      leadId,
      dealId: deal.id,
      eventType: "lender_action",
      description:
        actionType === "submitted"
          ? `Marked ${lenderName} as submitted and linked deal.`
          : `Proceeded with ${lenderName} and linked deal.`,
      metadata: { lenderName, actionType },
    });

    redirect(`/leads/${leadId}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName ?? ""}`}
        description="Lead record and lender fit for this contact."
        eyebrow="Lead"
        actions={
          <>
            <Link href="/leads" className="btn-secondary text-sm">
              All leads
            </Link>
            <Link href={`/leads/${leadId}/edit`} className="btn-secondary text-sm">
              Edit
            </Link>
            <SendLeadEmailModal
              leadId={leadId}
              leadEmail={lead.email}
              firstName={lead.firstName}
              replyToHint={resolvedReplyTo ?? null}
              customTemplates={emailTemplatesForComposer.map((t) => ({
                id: t.id,
                name: t.name,
                subject: t.subject,
                body: t.body,
              }))}
            />
            <DeleteLeadButton action={deleteLead} />
            <Link href={`/deals/new?leadId=${leadId}`} className="adm-btn-primary text-sm">
              Create deal
            </Link>
          </>
        }
      />

      <ContentCard title="Profile & criteria" description="Captured fields and workflow." padding="md">
          {(() => {
            const latest = lead.captureSubmissions[0];
            const fromForm = lead.captureSubmissions.length > 0;
            return (
              <div
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                  fromForm
                    ? "border-violet-200/80 bg-violet-50/90 text-violet-950"
                    : "border-slate-200/80 bg-slate-50 text-slate-800"
                }`}
              >
                <p className="font-semibold tracking-tight">Lead origin</p>
                <p className="mt-1 text-slate-700">
                  {fromForm ? (
                    <>
                      <span className="font-medium text-slate-900">
                        {leadSourceSummary(lead.captureSubmissions)}
                      </span>
                      {latest?.submittedAt ? (
                        <>
                          {" "}
                          · submitted{" "}
                          <span className="tabular-nums">{formatDateTime(latest.submittedAt)}</span>
                        </>
                      ) : null}
                      {lead.captureSubmissions.length > 1 ? (
                        <span className="ml-1 text-slate-600">
                          ({lead.captureSubmissions.length} form submissions on file)
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-slate-900">CRM</span> — created manually in
                      the app (no web form submission).
                    </>
                  )}
                </p>
              </div>
            );
          })()}

          <div className="grid gap-5 text-sm sm:grid-cols-1">
            <div>
              <p className="crm-field-label">Name</p>
              <p className="crm-field-value mt-1.5">
                {lead.firstName} {lead.lastName ?? ""}
              </p>
            </div>
            <div>
              <p className="crm-field-label">Email</p>
              <p className="crm-field-value mt-1.5">{lead.email ?? "—"}</p>
            </div>
            <div className="sm:col-span-1">
              <p className="crm-field-label">Workflow</p>
              <LeadWorkflowPanel
                currentStatusRaw={lead.status}
                updateWorkflowStatus={updateLeadWorkflowStatus}
              />
            </div>
            <div>
              <p className="crm-field-label">Created</p>
              <p className="mt-1.5 font-normal tabular-nums text-slate-800">
                {formatDateTime(lead.createdAt)}
              </p>
            </div>
            <div>
              <p className="crm-field-label">Phone</p>
              <p className="crm-field-value mt-1.5">{lead.phone ?? "—"}</p>
            </div>
            <div>
              <p className="crm-field-label">Company</p>
              <p className="crm-field-value mt-1.5">{lead.companyName ?? "—"}</p>
            </div>
            <div>
              <p className="crm-field-label">Requested amount</p>
              <p className="crm-field-value mt-1.5 tabular-nums">
                {formatUsdWhole(lead.requestedAmount)}
              </p>
            </div>
            <div>
              <p className="crm-field-label">Annual revenue</p>
              <p className="crm-field-value mt-1.5 tabular-nums">
                {formatUsdWhole(lead.annualRevenue)}
              </p>
            </div>
            <div>
              <p className="crm-field-label">Time trading</p>
              <p className="crm-field-value mt-1.5 tabular-nums">
                {lead.timeTradingMonths != null ? `${lead.timeTradingMonths} mo` : "—"}
              </p>
            </div>
            <div>
              <p className="crm-field-label">Credit issues</p>
              <p className="crm-field-value mt-1.5">{formatCreditIssues(lead.creditIssues)}</p>
            </div>
            <div>
              <p className="crm-field-label">Business type</p>
              <p className="crm-field-value mt-1.5">{lead.businessType ?? "—"}</p>
            </div>
            <div>
              <p className="crm-field-label">Notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{lead.notes ?? "—"}</p>
            </div>
          </div>
      </ContentCard>

        <div className="mt-8">
        {!latestLenderMatch ? (
          <ContentCard title="Lender fit" padding="md">
            <p className="text-sm text-slate-600">
              No match results for this lead yet. Rankings are created when someone submits your{" "}
              <Link href="/settings/integrations" className="font-semibold text-slate-900 underline underline-offset-2">
                public lead form
              </Link>
              .
            </p>
          </ContentCard>
        ) : displayRows.length === 0 ? (
          <ContentCard title="Lender fit" padding="md">
            <p className="text-xs text-slate-500">
              Last run {formatDateTime(latestLenderMatch.createdAt)} UTC · 0 lenders
            </p>
            <p className="mt-2 text-sm text-slate-600">
              No active lenders were available to rank. Add or enable lenders in{" "}
              <Link href="/lenders" className="font-semibold text-slate-900 underline">
                Lenders
              </Link>
              , then submit the form again (or re-run matching if your workflow supports it).
            </p>
          </ContentCard>
        ) : (
          <LenderMatchSection
            latestLenderMatch={latestLenderMatch}
            displayRows={displayRows}
            goodMatches={goodMatches}
            borderlineMatches={borderlineMatches}
            failedMatches={failedMatches}
            hasJsonFallback={
              latestLenderMatch.explanations.length === 0 && fallbackRanked.length > 0
            }
            onTakeAction={takeLenderAction}
          />
        )}
        </div>

        <ContentCard
          className="mt-8"
          title="Tasks"
          padding="md"
          headerExtra={
            <Link href={`/tasks/new?leadId=${leadId}`} className="btn-secondary-sm">
              Add task
            </Link>
          }
        >
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks linked to this lead.</p>
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

        <ContentCard
          className="mt-8"
          title="Emails"
          description="Messages sent to this lead from the CRM in this workspace."
          padding="md"
        >
          {sentEmails.length === 0 ? (
            <p className="text-sm text-slate-500">No emails sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {sentEmails.map((event) => {
                const email = parseEmailSentFromActivity(event);
                if (!email) {
                  return (
                    <li
                      key={event.id}
                      className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-950"
                    >
                      Email sent (details unavailable — older entry)
                    </li>
                  );
                }
                return (
                  <li
                    key={event.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sent ·{" "}
                      <time className="font-mono font-normal tabular-nums text-slate-700">
                        {formatDateTime(email.sentAt)} UTC
                      </time>
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                        <dt className="shrink-0 text-slate-500 sm:w-20">To</dt>
                        <dd className="min-w-0 break-all font-medium text-slate-900">{email.recipient}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                        <dt className="shrink-0 text-slate-500 sm:w-20">Subject</dt>
                        <dd className="min-w-0 text-slate-900">{email.subject}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </ContentCard>

        <ContentCard className="mt-8" title="Activity" padding="md">
          {leadActivities.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {leadActivities.map((event) => {
                const email = parseEmailSentFromActivity(event);
                if (email) {
                  return (
                    <li
                      key={event.id}
                      className="overflow-hidden rounded-xl border border-indigo-200/80 bg-indigo-50/40 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-white/60 px-4 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                          Email sent
                        </span>
                        <time className="text-xs tabular-nums text-slate-600">
                          {formatDateTime(email.sentAt)} UTC
                        </time>
                      </div>
                      <div className="space-y-2 px-4 py-3 text-sm">
                        <p>
                          <span className="text-slate-500">To </span>
                          <span className="break-all font-medium text-slate-900">{email.recipient}</span>
                        </p>
                        <p>
                          <span className="text-slate-500">Subject </span>
                          <span className="text-slate-900">{email.subject}</span>
                        </p>
                      </div>
                    </li>
                  );
                }
                return (
                  <li
                    key={event.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatLeadActivityType(event.eventType)}
                      </p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {formatDateShort(event.createdAt)} · {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{event.description}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </ContentCard>

        <ContentCard className="mt-8" title="Notes" padding="md">
          <form action={addNote} className="mb-4 space-y-2">
            <label htmlFor="lead-note-content" className="crm-field-label">
              Add note
            </label>
            <textarea
              id="lead-note-content"
              name="content"
              rows={4}
              className="adm-input"
              placeholder="Write a note..."
              required
            />
            <button type="submit" className="btn-secondary-sm">
              Add note
            </button>
          </form>

          {leadNotes.length === 0 ? (
            <p className="text-sm text-slate-500">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {leadNotes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <p className="text-sm leading-relaxed text-slate-800">{note.content}</p>
                  <p className="mt-2 text-xs tabular-nums text-slate-500">
                    {formatDateShort(note.createdAt)} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ContentCard>
    </div>
  );
}

