import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

export const dynamic = "force-dynamic";
import { ApiError } from "@/lib/api/errors";
import { getTenantContext } from "@/lib/auth/clerk";
import { INCLUDED_SEATS } from "@/lib/billing/seatConstants";
import { getClerkBackendClient } from "@/lib/clerk/clerkBackendClient";
import { getActiveMembershipTotalCount } from "@/lib/clerk/organizationMembers";

const InviteInput = z.object({
  emailAddress: z.string().email(),
  role: z.enum(["org:member", "org:admin"]).optional(),
});

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

    const activeMemberCount = await getActiveMembershipTotalCount(ctx.clerkOrgId);
    const seatNotice =
      !ctx.isBeta && activeMemberCount >= INCLUDED_SEATS
        ? "This will add £10/month to your subscription once the user accepts."
        : null;

    const clerkClient = getClerkBackendClient();
    const role = input.role ?? "org:member";

    await clerkClient.organizations.createOrganizationInvitation({
      organizationId: ctx.clerkOrgId,
      inviterUserId: ctx.clerkUserId,
      emailAddress: input.emailAddress,
      role,
    });

    return NextResponse.json({ ok: true, seatNotice });
  });
}
