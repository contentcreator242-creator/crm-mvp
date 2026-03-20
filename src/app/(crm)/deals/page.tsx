import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { getTenantContext } from "@/lib/auth/clerk";
import { crmStatusBadgeClass } from "@/lib/ui/crmBadges";
import { PageHeader } from "@/components/crm-shell";

const stages = ["new", "qualified", "won", "lost"] as const;
const StageEnum = z.enum(stages);

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DealsPage() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const deals = await prisma.deal.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  const leadIds = Array.from(
    new Set(
      deals
        .map((d) => d.leadId ?? d.contactId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const leads = leadIds.length
    ? await prisma.lead.findMany({
        where: { id: { in: leadIds }, organizationId },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const leadsById = new Map(leads.map((l) => [l.id, l]));

  async function moveStage(formData: FormData) {
    "use server";

    const ctx = await getTenantContext();
    const prisma = getPrisma();
    const organizationId = await resolveOrganizationId(ctx.clerkOrgId);

    const dealId = z.string().uuid().parse(formData.get("dealId"));
    const nextStage = StageEnum.parse(formData.get("stage"));

    await prisma.deal.updateMany({
      where: { id: dealId, organizationId },
      data: {
        // Use legacy field to remain compatible with older Prisma clients.
        status: nextStage,
      },
    });

    redirect("/deals");
  }

  const getStage = (deal: (typeof deals)[number]) => {
    return ((deal as any).stage ?? deal.status ?? "new") as (typeof stages)[number];
  };

  const byStage = {
    new: deals.filter((d) => getStage(d) === "new"),
    qualified: deals.filter((d) => getStage(d) === "qualified"),
    won: deals.filter((d) => getStage(d) === "won"),
    lost: deals.filter((d) => getStage(d) === "lost"),
  };

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <PageHeader
        title="Deals"
        description="Pipeline kanban for your active organization. Move cards between stages as deals progress."
        eyebrow="Revenue"
        actions={
          <Link href="/deals/new" className="adm-btn-primary text-sm">
            New deal
          </Link>
        }
      />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <section
              key={stage}
              className="flex min-h-[300px] flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-adm"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2">
                  <span className={crmStatusBadgeClass(stage)}>{stage}</span>
                </h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">
                  {byStage[stage].length}
                </span>
              </div>

              <div className="space-y-3">
                {byStage[stage].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs font-medium text-slate-500">
                    No deals
                  </div>
                ) : (
                  byStage[stage].map((deal) => (
                    <div
                      key={deal.id}
                      className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/30 p-4 shadow-sm transition hover:border-slate-200 hover:shadow-adm"
                    >
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-slate-600"
                      >
                        {(deal as any).name || deal.title}
                      </Link>
                      <div className="mt-3 space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Value
                        </p>
                        <p className="text-base font-semibold tabular-nums tracking-tight text-slate-900">
                          {formatCurrency(
                            typeof (deal as any).value === "number"
                              ? (deal as any).value
                              : deal.amountCents,
                          )}
                        </p>
                      </div>
                      <div className="mt-3 space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Lead</p>
                        {(() => {
                          const linkedLeadId = deal.leadId ?? deal.contactId;
                          if (!linkedLeadId || !leadsById.get(linkedLeadId)) {
                            return <p className="text-sm text-slate-700">-</p>;
                          }
                          return (
                            <Link
                              href={`/leads/${linkedLeadId}`}
                              className="text-sm font-medium text-slate-800 hover:underline"
                            >
                              {leadsById.get(linkedLeadId)?.firstName}{" "}
                              {leadsById.get(linkedLeadId)?.lastName ?? ""}
                            </Link>
                          );
                        })()}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">Created {formatDate(deal.createdAt)}</p>

                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {stages
                          .filter((s) => s !== stage)
                          .map((next) => (
                            <form key={next} action={moveStage}>
                              <input type="hidden" name="dealId" value={deal.id} />
                              <input type="hidden" name="stage" value={next} />
                              <button type="submit" className="btn-secondary-sm">
                                Move to {next}
                              </button>
                            </form>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
    </div>
  );
}

