import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

export const dynamic = "force-dynamic";
import { ApiError } from "@/lib/api/errors";
import { getTenantContext } from "@/lib/auth/clerk";
import { getClerkBackendClient } from "@/lib/clerk/clerkBackendClient";

type RouteParams = { params: Promise<{ invitationId: string }> };

/** Revoke a pending invitation (does not change billed seats until it was accepted). */
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

    const { invitationId } = await params;
    if (!invitationId) {
      throw new ApiError({ status: 400, code: "bad_request", message: "Missing invitation id" });
    }

    const clerk = getClerkBackendClient();
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: ctx.clerkOrgId,
      invitationId,
      requestingUserId: ctx.clerkUserId,
    });

    return NextResponse.json({ ok: true });
  });
}
