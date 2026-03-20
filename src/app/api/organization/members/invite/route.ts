import { NextResponse } from "next/server";
import { z } from "zod";
import { createClerkClient } from "@clerk/backend";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { getTenantContext } from "@/lib/auth/clerk";
import { getActiveSeatQuantity } from "@/lib/billing/entitlements";
import { assertSeatsAvailable } from "@/lib/billing/seatEnforcer";

const InviteInput = z.object({
  emailAddress: z.string().email(),
  role: z.enum(["org:member", "org:admin"]).optional(),
});

function getClerkBackendClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");
  return createClerkClient({ secretKey });
}

async function getActiveMembershipCount(clerkOrgId: string) {
  const clerkClient = getClerkBackendClient();

  // Clerk returns approved memberships (not pending invites) in this endpoint.
  const res = await clerkClient.organizations.getOrganizationMembershipList({
    organizationId: clerkOrgId,
    limit: 1,
    offset: 0,
  });

  const totalCount = (res as any)?.totalCount;
  if (typeof totalCount === "number") return totalCount;
  const memberships = (res as any)?.members ?? [];
  return memberships.length;
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      throw new ApiError({
        status: 403,
        code: "forbidden",
        message: "Admin privileges required",
      });
    }

    const input = InviteInput.parse(await req.json());

    const seatQuantity = await getActiveSeatQuantity(ctx.tenantId);

    if (!ctx.isBeta) {
      const activeMemberCount = await getActiveMembershipCount(ctx.clerkOrgId);
      assertSeatsAvailable({
        isBeta: ctx.isBeta,
        seatQuantity,
        activeMemberCount,
      });
    }

    const clerkClient = getClerkBackendClient();
    const role = input.role ?? "org:member";

    await clerkClient.organizations.createOrganizationInvitation({
      organizationId: ctx.clerkOrgId,
      inviterUserId: ctx.clerkUserId,
      emailAddress: input.emailAddress,
      role,
    });

    return NextResponse.json({ ok: true });
  });
}

