import { NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { syncStripeSeatsForClerkOrganizationId } from "@/lib/billing/syncStripeSubscriptionSeats";

export const dynamic = "force-dynamic";

function clerkOrgIdFromPayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.organization_id === "string") return d.organization_id;
  const org = d.organization;
  if (org && typeof org === "object" && "id" in org && typeof (org as { id: unknown }).id === "string") {
    return (org as { id: string }).id;
  }
  return null;
}

/**
 * Clerk → seat sync when memberships change (invite accepted, member removed, etc.).
 * Configure in Clerk Dashboard → Webhooks: `organizationInvitation.accepted`, `organizationMembership.created`, `organizationMembership.deleted`.
 */
export async function POST(req: Request) {
  try {
    const evt = await verifyWebhook(req);
    const types = new Set([
      "organizationInvitation.accepted",
      "organizationMembership.created",
      "organizationMembership.deleted",
    ]);
    if (!types.has(evt.type)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const clerkOrgId = clerkOrgIdFromPayload(evt.data);
    if (!clerkOrgId) {
      console.warn("[clerk-webhook] missing organization id", evt.type);
      return NextResponse.json({ ok: true });
    }

    await syncStripeSeatsForClerkOrganizationId(clerkOrgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[clerk-webhook]", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
