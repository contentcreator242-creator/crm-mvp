import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

export const dynamic = "force-dynamic";
import { ApiError } from "@/lib/api/errors";
import { getTenantContext } from "@/lib/auth/clerk";
import { getClerkBackendClient } from "@/lib/clerk/clerkBackendClient";
import { syncStripeSeatsForClerkOrganizationId } from "@/lib/billing/syncStripeSubscriptionSeats";

type RouteParams = { params: Promise<{ userId: string }> };

export async function DELETE(_req: Request, { params }: RouteParams) {
  return withErrorHandling(async () => {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      throw new ApiError({
        status: 403,
        code: "forbidden",
        message: "Admin privileges required",
      });
    }

    const { userId: targetUserId } = await params;
    if (!targetUserId) {
      throw new ApiError({ status: 400, code: "bad_request", message: "Missing user id" });
    }

    if (targetUserId === ctx.clerkUserId) {
      throw new ApiError({
        status: 400,
        code: "bad_request",
        message: "You cannot remove yourself from the organization.",
      });
    }

    const clerk = getClerkBackendClient();
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: ctx.clerkOrgId,
      userId: targetUserId,
    });

    await syncStripeSeatsForClerkOrganizationId(ctx.clerkOrgId);

    return NextResponse.json({ ok: true });
  });
}
