import { NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { syncStripeSeatsForClerkOrganizationId } from "@/lib/billing/syncStripeSubscriptionSeats";

export const dynamic = "force-dynamic";

function clerkOrgIdFromPayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.organization_id === "string") return d.organization_id;
  if (typeof d.organizationId === "string") return d.organizationId;
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
      return NextResponse.json({ ok: false, error: "missing organization id" }, { status: 400 });
    }

    console.info("[clerk-webhook] processing", { type: evt.type, clerkOrgId });
    await syncStripeSeatsForClerkOrganizationId(clerkOrgId);
    console.info("[clerk-webhook] synced-seats", { type: evt.type, clerkOrgId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const isVerifyError =
      message.includes("Missing required webhook headers") ||
      message.includes("Unable to verify incoming webhook") ||
      message.includes("Missing webhook signing secret");
    console.error("[clerk-webhook] failed", { message });
    return NextResponse.json({ ok: false }, { status: isVerifyError ? 400 : 500 });
  }
}
