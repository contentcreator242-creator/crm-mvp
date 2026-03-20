import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getStripe } from "@/lib/billing/stripe";
import { withTenantDb } from "@/lib/db/tenantDb";

function parseTenantIdFromMetadata(metadata: any): string | null {
  const raw = metadata?.tenantId ?? metadata?.tenant_id ?? metadata?.orgId;
  if (typeof raw !== "string") return null;
  return raw;
}

function getStripeQuantity(subscription: any): number {
  if (typeof subscription?.quantity === "number") return subscription.quantity;
  const item = subscription?.items?.data?.[0];
  if (item && typeof item.quantity === "number") return item.quantity;
  return 1;
}

export async function POST(req: Request) {
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

  let event: any;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "bad_request", message: "Invalid Stripe signature" } },
      { status: 400 },
    );
  }

  const eventId = event?.id;
  if (!eventId) {
    return NextResponse.json(
      { ok: false, error: { code: "bad_request", message: "Missing event id" } },
      { status: 400 },
    );
  }

  const type = event?.type as string;

  // We only need tenant scoping for writes to tenant-scoped tables.
  const subscription = event?.data?.object;
  const tenantId = parseTenantIdFromMetadata(
    subscription?.metadata ?? subscription?.customer_details?.metadata,
  );

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: { code: "bad_request", message: "Missing tenantId in Stripe metadata" } },
      { status: 400 },
    );
  }

  // Idempotent processing in a single tenant-scoped transaction.
  await withTenantDb(tenantId, async (tx) => {
    // Create idempotency record; on duplicates, stop early.
    try {
      await tx.stripeWebhookEvent.create({
        data: { eventId, eventType: type },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return;
      }
      throw err;
    }

    // Handle common subscription lifecycle events.
    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated" ||
      type === "customer.subscription.deleted"
    ) {
      const stripeSubscriptionId = subscription?.id as string | undefined;
      if (!stripeSubscriptionId) throw new Error("Missing subscription id");

      const stripeCustomerId = subscription?.customer as string | undefined;
      if (!stripeCustomerId) throw new Error("Missing subscription customer id");

      const quantity = getStripeQuantity(subscription);
      const status = subscription?.status as string | undefined;

      const currentPeriodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;

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
          status: status ?? "active",
          currentPeriodEnd,
        },
        update: {
          tenantId,
          quantity,
          status: status ?? "active",
          currentPeriodEnd,
        },
      });
    }
  });

  // Ack quickly so Stripe doesn't retry aggressively.
  return NextResponse.json({ ok: true });
}

