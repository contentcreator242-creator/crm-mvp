import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createOrganizationCheckoutSession } from "@/lib/billing/createOrganizationCheckoutSession";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/checkout-session
 * Creates a Stripe Checkout Session (subscription mode) for the signed-in user's active Clerk organization.
 */
export async function POST() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "Choose or create an organization before checkout." },
      { status: 400 },
    );
  }

  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const result = await createOrganizationCheckoutSession(organizationId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, url: result.url });
}
