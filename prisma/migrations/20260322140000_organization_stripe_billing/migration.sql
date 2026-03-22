-- Stripe Billing fields on CRM organizations (Lendex subscription)
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "subscription_status" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripe_subscription_id_key" ON "organizations"("stripe_subscription_id");
