import type { OrganizationInvitation, OrganizationMembership } from "@clerk/backend";
import { getClerkBackendClient } from "@/lib/clerk/clerkBackendClient";

/** Active (accepted) memberships only — pending invites are not included. */
export async function getActiveMembershipTotalCount(clerkOrganizationId: string): Promise<number> {
  const clerk = getClerkBackendClient();
  const res = await clerk.organizations.getOrganizationMembershipList({
    organizationId: clerkOrganizationId,
    limit: 1,
    offset: 0,
  });
  return res.totalCount;
}

export async function listOrganizationMemberships(
  clerkOrganizationId: string,
): Promise<OrganizationMembership[]> {
  const clerk = getClerkBackendClient();
  const all: OrganizationMembership[] = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const res = await clerk.organizations.getOrganizationMembershipList({
      organizationId: clerkOrganizationId,
      limit,
      offset,
    });
    all.push(...res.data);
    if (res.data.length < limit) break;
    offset += limit;
  }
  return all;
}

/** Pending invitations only (not yet accepted — do not count toward seats). */
export async function listPendingInvitations(clerkOrganizationId: string): Promise<OrganizationInvitation[]> {
  const clerk = getClerkBackendClient();
  const res = await clerk.organizations.getOrganizationInvitationList({
    organizationId: clerkOrganizationId,
    status: ["pending"],
    limit: 100,
  });
  return res.data;
}
