import type Stripe from "stripe";
import { getAppOrigin } from "@/lib/billing/appUrl";
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
  // Temporary debug — remove after Stripe env is confirmed on Vercel.
  const rawPrice = Reflect.get(process.env, "STRIPE_PRICE_ID");
  const rawAppUrl = Reflect.get(process.env, "NEXT_PUBLIC_APP_URL");
  console.info("[billing-env-debug] createOrganizationCheckoutSession", {
    STRIPE_PRICE_ID_defined: typeof rawPrice === "string" && rawPrice.trim().length > 0,
    STRIPE_PRICE_ID_length: typeof rawPrice === "string" ? rawPrice.trim().length : 0,
    NEXT_PUBLIC_APP_URL_defined: typeof rawAppUrl === "string" && rawAppUrl.trim().length > 0,
    NEXT_PUBLIC_APP_URL_length: typeof rawAppUrl === "string" ? rawAppUrl.trim().length : 0,
  });

  const priceId = readServerEnvTrimmed("STRIPE_PRICE_ID");
  if (!priceId) {
    return { ok: false, error: "Billing is not configured (missing STRIPE_PRICE_ID).", status: 503 };
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
    },
  });

  if (!org) {
    return { ok: false, error: "Organization not found.", status: 404 };
  }

  const base = getAppOrigin();

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
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
