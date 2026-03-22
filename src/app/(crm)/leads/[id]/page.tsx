import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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
import { matchLenderIdFromDisplayName } from "@/lib/lenders/matchLenderIdByDisplayName";
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
import { trackLendersFromLeadAction } from "./trackLendersFromLeadAction";
import { refreshLenderMatchesForLeadAction } from "./refreshLenderMatchesAction";
import { RefreshLenderMatchesForm } from "./RefreshLenderMatchesForm";
import { hasCoreFinanceSignalsForMatching, leadToMatchSignals } from "@/lib/matching/runCrmLeadMatching";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ refresh?: string }>;
}) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const { id } = await params;
  const refreshQuery = searchParams ? (await searchParams).refresh : undefined;
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
  const orgLendersForMatch = await prisma.lender.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const displayRowsWithLenders = displayRows.map((r) => ({
    ...r,
    resolvedLenderId: matchLenderIdFromDisplayName(orgLendersForMatch, r.lenderName),
  }));
  const { good: goodMatches, borderline: borderlineMatches, failed: failedMatches } =
    groupDisplayRowsByTier(displayRowsWithLenders);

  const canRefreshMatches = hasCoreFinanceSignalsForMatching(leadToMatchSignals(lead));

  const refreshMatchesSlot = (
    <RefreshLenderMatchesForm
      leadId={leadId}
      action={refreshLenderMatchesForLeadAction}
      disabled={!canRefreshMatches}
      disabledReason={
        canRefreshMatches
          ? undefined
          : "Add at least one funding field (e.g. requested amount, revenue, time trading, credit, or business type)."
      }
    />
  );

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

    const leadIdFromForm = formData.get("leadId")?.toString()?.trim() ?? "";
    const targetLeadIdParsed = z.string().uuid().safeParse(leadIdFromForm);
    const targetLeadId = targetLeadIdParsed.success ? targetLeadIdParsed.data : leadId;
    if (!z.string().uuid().safeParse(targetLeadId).success) redirect("/leads");

    const parsed = leadWorkflowStatusSchema.safeParse(
      formData.get("workflowStatus")?.toString()?.trim(),
    );
    if (!parsed.success) redirect(`/leads/${targetLeadId}`);

    const existing = await prismaInner.lead.findFirst({
      where: { id: targetLeadId, organizationId: organizationIdInner },
      select: { status: true },
    });
    if (!existing) redirect("/leads");

    const result = await prismaInner.lead.updateMany({
      where: { id: targetLeadId, organizationId: organizationIdInner },
      data: { status: parsed.data },
    });

    console.log("[updateLeadWorkflowStatus]", {
      targetLeadId,
      nextStatus: parsed.data,
      organizationId: organizationIdInner,
      updatedCount: result.count,
    });

    if ((existing.status ?? "").toLowerCase() !== parsed.data.toLowerCase()) {
      await createLeadActivity(prismaInner, {
        organizationId: organizationIdInner,
        leadId: targetLeadId,
        eventType: "status_changed",
        description: `Status changed from ${existing.status ?? "new"} to ${parsed.data}.`,
        metadata: { from: existing.status ?? null, to: parsed.data },
      });
    }

    revalidatePath(`/leads/${targetLeadId}`);
    redirect(`/leads/${targetLeadId}`);
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

      {refreshQuery === "ok" ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Lender matches updated using the current lead details.
        </div>
      ) : null}
      {refreshQuery === "insufficient" ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Not enough funding detail on this lead to run matching. Add fields such as requested amount or annual
          revenue, then try again.
        </div>
      ) : null}
      {refreshQuery === "error" ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Matching could not be completed. Try again in a moment or check that lenders are set up for your workspace.
        </div>
      ) : null}

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

          <div className="space-y-8 text-sm">
            <div className="grid gap-5 sm:grid-cols-2">
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
              <div>
                <p className="crm-field-label">Phone</p>
                <p className="crm-field-value mt-1.5">{lead.phone ?? "—"}</p>
              </div>
              <div>
                <p className="crm-field-label">Company</p>
                <p className="crm-field-value mt-1.5">{lead.companyName ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-inner">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Funding &amp; business</p>
              <p className="mt-1 text-xs text-slate-600">
                Used for lender matching and deal setup — edit the lead to update these values.
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="crm-field-label">Requested amount</dt>
                  <dd className="crm-field-value mt-1.5 tabular-nums">{formatUsdWhole(lead.requestedAmount)}</dd>
                </div>
                <div>
                  <dt className="crm-field-label">Annual revenue</dt>
                  <dd className="crm-field-value mt-1.5 tabular-nums">{formatUsdWhole(lead.annualRevenue)}</dd>
                </div>
                <div>
                  <dt className="crm-field-label">Time trading</dt>
                  <dd className="crm-field-value mt-1.5 tabular-nums">
                    {lead.timeTradingMonths != null ? `${lead.timeTradingMonths} months` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="crm-field-label">Credit issues</dt>
                  <dd className="crm-field-value mt-1.5">{formatCreditIssues(lead.creditIssues)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="crm-field-label">Business type</dt>
                  <dd className="crm-field-value mt-1.5">{lead.businessType ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="crm-field-label">Last matched</dt>
                  <dd className="crm-field-value mt-1.5 tabular-nums">
                    {lead.lastMatchedAt != null ? `${formatDateTime(lead.lastMatchedAt)} UTC` : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="crm-field-label">Workflow</p>
                <div className="mt-1.5">
                  <LeadWorkflowPanel
                    leadId={leadId}
                    currentStatusRaw={lead.status}
                    updateWorkflowStatus={updateLeadWorkflowStatus}
                  />
                </div>
              </div>
              <div>
                <p className="crm-field-label">Created</p>
                <p className="mt-1.5 font-normal tabular-nums text-slate-800">
                  {formatDateTime(lead.createdAt)}
                </p>
              </div>
            </div>

            <div>
              <p className="crm-field-label">Notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{lead.notes ?? "—"}</p>
            </div>
          </div>
      </ContentCard>

        <div className="mt-10 lg:mt-12">
        {!latestLenderMatch ? (
          <ContentCard title="Lender fit" padding="md" headerExtra={refreshMatchesSlot}>
            <p className="text-sm text-slate-600">
              No match results for this lead yet. Rankings are created when someone submits your{" "}
              <Link href="/settings/integrations" className="font-semibold text-slate-900 underline underline-offset-2">
                public lead form
              </Link>
              , or use <span className="font-semibold">Refresh matches</span> when funding details are filled in.
            </p>
          </ContentCard>
        ) : displayRowsWithLenders.length === 0 ? (
          <ContentCard title="Lender fit" padding="md" headerExtra={refreshMatchesSlot}>
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
            leadId={leadId}
            latestLenderMatch={latestLenderMatch}
            displayRows={displayRowsWithLenders}
            goodMatches={goodMatches}
            borderlineMatches={borderlineMatches}
            failedMatches={failedMatches}
            hasJsonFallback={
              latestLenderMatch.explanations.length === 0 && fallbackRanked.length > 0
            }
            trackLendersAction={trackLendersFromLeadAction}
            refreshMatchesSlot={refreshMatchesSlot}
          />
        )}
        </div>

        <ContentCard
          className="mt-10 lg:mt-12"
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
          className="mt-10 lg:mt-12"
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

        <ContentCard className="mt-10 lg:mt-12" title="Notes" padding="md">
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

