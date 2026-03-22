import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOrganizationAdminFromSession } from "@/lib/auth/clerk";
import { resolveOrganizationId } from "@/lib/auth/organization";
import {
  listOrganizationMemberships,
  listPendingInvitations,
} from "@/lib/clerk/organizationMembers";
import { syncStripeSubscriptionSeatsForOrganization } from "@/lib/billing/syncStripeSubscriptionSeats";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { InviteMemberForm } from "./InviteMemberForm";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { RevokeInvitationButton } from "./RevokeInvitationButton";

export default async function TeamSettingsPage() {
  const authState = await auth();
  const { userId, orgId, orgSlug, orgRole } = authState;
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const isAdmin = isOrganizationAdminFromSession(authState);

  await syncStripeSubscriptionSeatsForOrganization(organizationId);

  const [memberships, invitations] = await Promise.all([
    listOrganizationMemberships(orgId),
    listPendingInvitations(orgId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Team"
        description="Invite colleagues, manage members, and review pending invitations. (Invites and removals require workspace admin.)"
        eyebrow="Settings"
      />

      {isAdmin ? (
        <ContentCard title="Invite people" description="Send an email invitation to join this workspace." padding="md">
          <InviteMemberForm />
        </ContentCard>
      ) : (
        <ContentCard
          title="Invitations"
          description="You can view members below. Only workspace admins can send invites or remove people."
          padding="md"
        >
          <p className="text-sm text-slate-700">
            Your role in this workspace:{" "}
            <span className="font-semibold text-slate-900">{orgRole ?? "Member"}</span>. Ask an admin to grant the{" "}
            <strong className="font-semibold">Admin</strong> role in Clerk (Organization members) if you should manage
            invites.
          </p>
        </ContentCard>
      )}

      <ContentCard title="Active members" description="Accepted users with access to this organization." padding="md">
        <ul className="divide-y divide-slate-100">
          {memberships.flatMap((m) => {
            const u = m.publicUserData;
            if (!u) return [];
            const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
            const label = name || u.identifier || u.userId;
            const canRemove = isAdmin && u.userId !== userId;
            return [
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">
                    {u.identifier} · {m.role}
                  </p>
                </div>
                {canRemove ? <RemoveMemberButton userId={u.userId} label={label} /> : null}
              </li>,
            ];
          })}
        </ul>
      </ContentCard>

      {invitations.length > 0 ? (
        <ContentCard title="Pending invitations" description="Not billed until the invite is accepted." padding="md">
          <ul className="divide-y divide-slate-100">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{inv.emailAddress}</p>
                  <p className="text-xs text-slate-500">{inv.role}</p>
                </div>
                {isAdmin ? <RevokeInvitationButton invitationId={inv.id} email={inv.emailAddress} /> : null}
              </li>
            ))}
          </ul>
        </ContentCard>
      ) : null}
    </div>
  );
}
