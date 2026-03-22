import type Stripe from "stripe";
import { getActiveMembershipTotalCount } from "@/lib/clerk/organizationMembers";
import { getAppOrigin } from "@/lib/billing/appUrl";
import { extraSeatsFromActiveCount } from "@/lib/billing/seatConstants";
import { readServerEnvTrimmed } from "@/lib/billing/readServerEnv";
import { getStripe } from "@/lib/billing/stripe";
import { getPrisma } from "@/lib/db/prisma";

export type CheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number };

/**
 * Creates a Stripe Checkout Session in subscription mode for the given CRM organization.
 */
export async function createOrganizationCheckoutSession(organizationId: string): Promise<CheckoutSessionResult> {
  const basePriceId = readServerEnvTrimmed("STRIPE_PRICE_ID");
  const seatPriceId = readServerEnvTrimmed("STRIPE_SEAT_PRICE_ID");
  if (!basePriceId) {
    return { ok: false, error: "Billing is not configured (missing STRIPE_PRICE_ID).", status: 503 };
  }
  if (!seatPriceId) {
    return { ok: false, error: "Billing is not configured (missing STRIPE_SEAT_PRICE_ID).", status: 503 };
  }

  if (!readServerEnvTrimmed("STRIPE_SECRET_KEY")) {
    return { ok: false, error: "Billing is not configured (missing STRIPE_SECRET_KEY).", status: 503 };
  }

  const prisma = getPrisma();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      stripeCustomerId: true,
      clerkOrganizationId: true,
    },
  });

  if (!org) {
    return { ok: false, error: "Organization not found.", status: 404 };
  }

  const base = getAppOrigin();

  const activeMembers = await getActiveMembershipTotalCount(org.clerkOrganizationId);
  const extraSeats = extraSeatsFromActiveCount(activeMembers);

  const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [
    { price: basePriceId, quantity: 1 },
  ];
  if (extraSeats > 0) {
    lineItems.push({ price: seatPriceId, quantity: extraSeats });
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: lineItems,
    success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/#pricing`,
    client_reference_id: organizationId,
    metadata: { organizationId },
    subscription_data: {
      metadata: { organizationId },
    },
    allow_promotion_codes: true,
  };

  if (org.stripeCustomerId) {
    params.customer = org.stripeCustomerId;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(params);

  if (!session.url) {
    return { ok: false, error: "Stripe did not return a checkout URL.", status: 502 };
  }

  return { ok: true, url: session.url };
}
