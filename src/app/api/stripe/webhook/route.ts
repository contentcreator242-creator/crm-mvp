import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { syncStripeSubscriptionSeatsForOrganization } from "@/lib/billing/syncStripeSubscriptionSeats";
import { getPrisma } from "@/lib/db/prisma";
import { withTenantDb } from "@/lib/db/tenantDb";

function parseTenantIdFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const raw = metadata?.tenantId ?? metadata?.tenant_id ?? metadata?.orgId;
  if (typeof raw !== "string") return null;
  return raw;
}

function getStripeQuantity(subscription: Stripe.Subscription): number {
  const item = subscription.items?.data?.[0];
  if (item && typeof item.quantity === "number") return item.quantity;
  return 1;
}

async function markWebhookEventProcessed(eventId: string, eventType: string): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.stripeWebhookEvent.create({
      data: { eventId, eventType },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return;
    }
    throw err;
  }
}

async function resolveOrganizationIdForSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.organizationId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;

  const prisma = getPrisma();
  const row = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: sub.id },
    select: { id: true },
  });
  return row?.id ?? null;
}

function customerIdFromSubscription(sub: Stripe.Subscription): string | null {
  const c = sub.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c && typeof c.id === "string") return c.id;
  return null;
}

async function syncOrganizationSubscription(sub: Stripe.Subscription, organizationId: string) {
  const prisma = getPrisma();
  const customerId = customerIdFromSubscription(sub);
  if (!customerId) throw new Error("Missing subscription customer id");

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
    },
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  const fromMeta =
    typeof session.metadata?.organizationId === "string" && session.metadata.organizationId.trim().length > 0
      ? session.metadata.organizationId.trim()
      : null;
  const fromClientRef =
    typeof session.client_reference_id === "string" && session.client_reference_id.trim().length > 0
      ? session.client_reference_id.trim()
      : null;
  const organizationId = fromMeta ?? fromClientRef;

  if (!organizationId) {
    console.error("[stripe-webhook] checkout.session.completed missing organization linkage", {
      sessionId: session.id,
      hasMetadataOrganizationId: Boolean(fromMeta),
      hasClientReferenceId: Boolean(fromClientRef),
    });
    throw new Error("checkout.session.completed missing organization id");
  }

  const subRef = session.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;
  if (!subId) {
    console.warn("[stripe-webhook] checkout.session.completed missing subscription id", session.id);
    return;
  }

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  const fromSubMeta =
    typeof sub.metadata?.organizationId === "string" && sub.metadata.organizationId.trim().length > 0
      ? sub.metadata.organizationId.trim()
      : null;
  const targetOrg = fromSubMeta ?? organizationId;
  console.info("[stripe-webhook] checkout.session.completed linking organization", {
    sessionId: session.id,
    subscriptionId: sub.id,
    organizationId: targetOrg,
  });
  await syncOrganizationSubscription(sub, targetOrg);
  await syncStripeSubscriptionSeatsForOrganization(targetOrg);
}

async function handleLegacyTenantSubscriptionEvent(sub: Stripe.Subscription) {
  const tenantId = parseTenantIdFromMetadata(sub.metadata);
  if (!tenantId) return;

  const stripeSubscriptionId = sub.id;
  const stripeCustomerId = customerIdFromSubscription(sub);
  if (!stripeCustomerId) throw new Error("Missing subscription customer id");

  const quantity = getStripeQuantity(sub);
  const status = sub.status;
  const periodEndUnix = sub.items?.data?.[0]?.current_period_end;
  const currentPeriodEnd =
    typeof periodEndUnix === "number" ? new Date(periodEndUnix * 1000) : null;

  await withTenantDb(tenantId, async (tx) => {
    await tx.stripeCustomer.upsert({
      where: { stripeCustomerId },
      create: {
        tenantId,
        stripeCustomerId,
      },
      update: {
        tenantId,
      },
    });

    await tx.subscriptionEntitlement.upsert({
      where: { stripeSubscriptionId },
      create: {
        tenantId,
        stripeSubscriptionId,
        quantity,
        status,
        currentPeriodEnd,
      },
      update: {
        tenantId,
        quantity,
        status,
        currentPeriodEnd,
      },
    });
  });
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: { code: "internal_error", message: "Missing STRIPE_SECRET_KEY" } },
      { status: 500 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: { code: "internal_error", message: "Missing webhook secret" } },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: { code: "bad_request", message: "Missing stripe-signature header" } },
      { status: 400 },
    );
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "bad_request", message: "Invalid Stripe signature" } },
      { status: 400 },
    );
  }

  const eventId = event.id;
  const type = event.type;

  const shouldProcess =
    type === "checkout.session.completed" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted";

  if (!shouldProcess) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const prisma = getPrisma();
  const alreadyHandled = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId },
    select: { eventId: true },
  });
  if (alreadyHandled) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    } else {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = await resolveOrganizationIdForSubscription(sub);
      if (orgId) {
        await syncOrganizationSubscription(sub, orgId);
        await syncStripeSubscriptionSeatsForOrganization(orgId);
      } else if (parseTenantIdFromMetadata(sub.metadata)) {
        await handleLegacyTenantSubscriptionEvent(sub);
      } else {
        console.info("[stripe-webhook] subscription event not routed (no organization or tenant metadata)", sub.id);
      }
    }

    await markWebhookEventProcessed(eventId, type);
  } catch (e) {
    console.error("[stripe-webhook] handler error", eventId, type, e);
    return NextResponse.json({ ok: false, error: { code: "internal_error" } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
