import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { getPrisma } from "@/lib/db/prisma";
import { getActiveMembershipTotalCount } from "@/lib/clerk/organizationMembers";
import {
  BASE_PLAN_GBP_PER_MONTH,
  EXTRA_SEAT_GBP_PER_MONTH,
  INCLUDED_SEATS,
  estimatedMonthlyTotalGbp,
  extraSeatsFromActiveCount,
} from "@/lib/billing/seatConstants";
import { ContentCard, PageHeader } from "@/components/crm-shell";

export default async function BillingSettingsPage() {
  const t0 = performance.now();
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const [activeCount, org] = await Promise.all([
    getActiveMembershipTotalCount(orgId),
    getPrisma().organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionStatus: true,
        stripeSubscriptionId: true,
      },
    }),
  ]);

  const extra = extraSeatsFromActiveCount(activeCount);
  const estimated = estimatedMonthlyTotalGbp(activeCount);
  const subscribed =
    org?.subscriptionStatus === "active" ||
    org?.subscriptionStatus === "trialing" ||
    Boolean(org?.stripeSubscriptionId);
  console.info("[perf] settings-billing", {
    organizationId,
    activeCount,
    subscribed,
    elapsedMs: Math.round(performance.now() - t0),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Billing"
        description="Seat-based subscription: base plan plus £10/month for each active user beyond three."
        eyebrow="Settings"
        actions={
          subscribed ? null : (
            <Link href="/subscribe" className="btn-secondary text-sm">
              Subscribe
            </Link>
          )
        }
      />

      <ContentCard title="Current estimate" padding="md">
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Included users (base plan)</dt>
            <dd className="font-semibold text-slate-900">{INCLUDED_SEATS}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Active users</dt>
            <dd className="font-semibold text-slate-900">{activeCount}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Extra seats billed</dt>
            <dd className="font-semibold text-slate-900">{extra}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Base plan</dt>
            <dd className="font-semibold text-slate-900">£{BASE_PLAN_GBP_PER_MONTH}/month</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Extra seats</dt>
            <dd className="font-semibold text-slate-900">
              {extra > 0 ? `£${EXTRA_SEAT_GBP_PER_MONTH} × ${extra} = £${extra * EXTRA_SEAT_GBP_PER_MONTH}/month` : "£0"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 pt-1">
            <dt className="text-base font-semibold text-slate-900">Estimated monthly total</dt>
            <dd className="text-base font-semibold text-slate-900">£{estimated}/month</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Actual charges follow your Stripe subscription and proration. Subscription status:{" "}
          <span className="font-mono">{org?.subscriptionStatus ?? "none"}</span>.
        </p>
      </ContentCard>
    </div>
  );
}
