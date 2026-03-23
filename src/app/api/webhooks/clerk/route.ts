import { NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { syncStripeSeatsForClerkOrganizationId } from "@/lib/billing/syncStripeSubscriptionSeats";

export const dynamic = "force-dynamic";

const LOG = "[clerk-webhook]";

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
  console.info(LOG, "step=route-entered", { method: req.method, url: req.url });

  const svixId = req.headers.get("svix-id");
  const svixTs = req.headers.get("svix-timestamp");
  const svixSig = req.headers.get("svix-signature");
  console.info(LOG, "step=request-headers-received", {
    "svix-id": svixId ? `present(len=${svixId.length})` : "absent",
    "svix-timestamp": svixTs ? `present(len=${svixTs.length})` : "absent",
    "svix-signature": svixSig ? `present(len=${svixSig.length})` : "absent",
    "content-type": req.headers.get("content-type") ?? "absent",
  });

  let bodyBytes = 0;
  try {
    const clone = req.clone();
    const raw = await clone.text();
    bodyBytes = raw.length;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(LOG, "step=request-body-read-failed", { message, stack });
    return NextResponse.json({ error: "missing request body" }, { status: 400 });
  }
  if (bodyBytes === 0) {
    console.warn(LOG, "step=request-body-empty");
    return NextResponse.json({ error: "missing request body" }, { status: 400 });
  }
  console.info(LOG, "step=request-body-received", { bytes: bodyBytes });

  console.info(LOG, "step=signature-verification-starting");

  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(LOG, "step=signature-verification-failed", { message, stack });

    if (message.includes("Missing required webhook headers:")) {
      return NextResponse.json({ error: "missing webhook headers" }, { status: 400 });
    }
    if (message.includes("Missing webhook signing secret")) {
      return NextResponse.json({ error: "webhook signing secret not configured" }, { status: 500 });
    }
    if (message.includes("Unable to verify incoming webhook")) {
      return NextResponse.json({ error: "webhook verification failed" }, { status: 401 });
    }
    console.error(LOG, "step=signature-verification-unexpected-error", { message, stack });
    return NextResponse.json({ error: "webhook handler error" }, { status: 500 });
  }

  console.info(LOG, "step=signature-verification-passed");

  const types = new Set([
    "organizationInvitation.accepted",
    "organizationMembership.created",
    "organizationMembership.deleted",
  ]);

  console.info(LOG, "step=event-type-received", { type: evt.type });

  if (!types.has(evt.type)) {
    console.info(LOG, "step=event-ignored-not-seat-sync", { type: evt.type });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const clerkOrgId = clerkOrgIdFromPayload(evt.data);
  if (!clerkOrgId) {
    console.warn(LOG, "step=organization-id-unresolved", { type: evt.type });
    return NextResponse.json({ error: "missing organization id" }, { status: 400 });
  }
  console.info(LOG, "step=organization-id-resolved", { clerkOrgId, type: evt.type });

  console.info(LOG, "step=stripe-seat-sync-starting", { clerkOrgId, type: evt.type });
  try {
    await syncStripeSeatsForClerkOrganizationId(clerkOrgId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(LOG, "step=stripe-seat-sync-failed", { message, stack, clerkOrgId });
    if (message.toLowerCase().includes("organization not found")) {
      return NextResponse.json({ error: "organization not found" }, { status: 500 });
    }
    return NextResponse.json({ error: "stripe seat sync failed" }, { status: 500 });
  }

  console.info(LOG, "step=stripe-seat-sync-succeeded", { clerkOrgId, type: evt.type });
  return NextResponse.json({ ok: true });
}
