import { getStripe } from "@/lib/billing/stripe";
import { readServerEnvTrimmed } from "@/lib/billing/readServerEnv";
import { getPrisma } from "@/lib/db/prisma";
import { getActiveMembershipTotalCount } from "@/lib/clerk/organizationMembers";
import { extraSeatsFromActiveCount } from "@/lib/billing/seatConstants";

/**
 * Updates the Stripe subscription **seat** line item quantity to match current active Clerk members.
 *
 * **Where quantity is updated:** `stripe.subscriptionItems.update(..., { quantity })` or
 * `stripe.subscriptionItems.create` / `stripe.subscriptionItems.del` on the item whose **price** is
 * `STRIPE_SEAT_PRICE_ID`. The base plan item (`STRIPE_PRICE_ID`) is left unchanged.
 */
export async function syncStripeSubscriptionSeatsForOrganization(organizationId: string): Promise<void> {
  const t0 = performance.now();
  const basePriceId = readServerEnvTrimmed("STRIPE_PRICE_ID");
  const seatPriceId = readServerEnvTrimmed("STRIPE_SEAT_PRICE_ID");
  if (!basePriceId || !seatPriceId) {
    console.warn(
      "[stripe-seats] skip sync: STRIPE_PRICE_ID or STRIPE_SEAT_PRICE_ID missing",
      organizationId,
    );
    return;
  }

  const prisma = getPrisma();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      clerkOrganizationId: true,
    },
  });

  if (!org?.stripeSubscriptionId || !org.clerkOrganizationId) {
    if (org && !org.stripeSubscriptionId) {
      console.warn("[stripe-seats] skip sync: organization has no stripeSubscriptionId", organizationId);
    }
    return;
  }

  const activeCount = await getActiveMembershipTotalCount(org.clerkOrganizationId);
  const extraSeats = extraSeatsFromActiveCount(activeCount);

  const stripe = getStripe();
  const seatPrice = await stripe.prices.retrieve(seatPriceId);
  if (!seatPrice.active || seatPrice.type !== "recurring" || !seatPrice.recurring) {
    throw new Error(
      `[stripe-seats] invalid STRIPE_SEAT_PRICE_ID=${seatPriceId} active=${seatPrice.active} type=${seatPrice.type}`,
    );
  }
  const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
    expand: ["items.data.price"],
  });
  console.info("[stripe-seats] sync-start", {
    organizationId,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripeSubscriptionId: org.stripeSubscriptionId,
    activeCount,
    extraSeats,
    basePriceId,
    seatPriceId,
    seatPriceCurrency: seatPrice.currency,
    seatPriceInterval: seatPrice.recurring.interval,
  });

  const items = sub.items.data;
  const seatItem = items.find((i) => {
    const p = i.price;
    const pid = typeof p === "string" ? p : p?.id;
    return pid === seatPriceId;
  });
  const baseItem = items.find((i) => {
    const p = i.price;
    const pid = typeof p === "string" ? p : p?.id;
    return pid === basePriceId;
  });

  if (!baseItem) {
    console.warn("[stripe-seats] subscription missing base price item", org.stripeSubscriptionId, basePriceId);
  }

  if (extraSeats === 0) {
    if (seatItem) {
      console.info("[stripe-seats] deleting-seat-item", {
        organizationId,
        seatItemId: seatItem.id,
      });
      await stripe.subscriptionItems.del(seatItem.id, { proration_behavior: "create_prorations" });
    }
    console.info("[perf] stripe-seat-sync", {
      organizationId,
      activeCount,
      extraSeats,
      elapsedMs: Math.round(performance.now() - t0),
    });
    return;
  }

  if (seatItem) {
    if (seatItem.quantity !== extraSeats) {
      console.info("[stripe-seats] updating-seat-item", {
        organizationId,
        seatItemId: seatItem.id,
        fromQuantity: seatItem.quantity ?? 0,
        toQuantity: extraSeats,
      });
      await stripe.subscriptionItems.update(seatItem.id, {
        quantity: extraSeats,
        proration_behavior: "create_prorations",
      });
    }
    console.info("[perf] stripe-seat-sync", {
      organizationId,
      activeCount,
      extraSeats,
      elapsedMs: Math.round(performance.now() - t0),
    });
    return;
  }

  console.info("[stripe-seats] creating-seat-item", {
    organizationId,
    stripeSubscriptionId: org.stripeSubscriptionId,
    quantity: extraSeats,
  });
  await stripe.subscriptionItems.create({
    subscription: org.stripeSubscriptionId,
    price: seatPriceId,
    quantity: extraSeats,
    proration_behavior: "create_prorations",
  });
  console.info("[perf] stripe-seat-sync", {
    organizationId,
    activeCount,
    extraSeats,
    elapsedMs: Math.round(performance.now() - t0),
  });
}

export async function syncStripeSeatsForClerkOrganizationId(clerkOrganizationId: string): Promise<void> {
  const prisma = getPrisma();
  const row = await prisma.organization.findUnique({
    where: { clerkOrganizationId },
    select: { id: true },
  });
  if (!row) {
    throw new Error(`[stripe-seats] organization not found for clerkOrganizationId=${clerkOrganizationId}`);
  }
  await syncStripeSubscriptionSeatsForOrganization(row.id);
}
