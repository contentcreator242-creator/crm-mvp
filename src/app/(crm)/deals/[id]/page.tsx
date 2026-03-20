import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { crmStatusBadgeClass } from "@/lib/ui/crmBadges";
import { ContentCard, PageHeader } from "@/components/crm-shell";

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
  if (!date) return "-";
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

  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      dealId,
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={String((deal as any).name || deal.title)}
        description="Deal record and related tasks."
        eyebrow="Deal"
        actions={
          <Link href="/deals" className="btn-secondary text-sm">
            All deals
          </Link>
        }
      />

      <ContentCard title="Summary" padding="md">
          <div className="space-y-4 text-sm">
            <div>
              <p className="crm-field-label">Status</p>
              <p className="mt-1.5">
                <span
                  className={crmStatusBadgeClass(
                    String((deal as any).stage || deal.status || "new"),
                  )}
                >
                  {(deal as any).stage || deal.status}
                </span>
              </p>
            </div>
            <div>
              <p className="crm-field-label">Value</p>
              <p className="crm-field-value mt-1.5 text-base tabular-nums">
                {formatCurrency(
                  typeof (deal as any).value === "number"
                    ? (deal as any).value
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

