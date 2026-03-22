-- One-shot alignment for `organizations` when the DB predates Prisma migrate history (e.g. Supabase + P3005).
-- Safe to run multiple times. Run in Supabase SQL Editor (or psql), then use `prisma migrate resolve --applied ...`.

-- 1) Onboarding column (matches prisma/migrations/20260321120000_onboarding_completed_at)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP(3);

-- Optional: treat all existing orgs as onboarded (same as original migration intent).
-- Comment out the next line if new orgs should see /onboarding.
UPDATE public.organizations
SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE onboarding_completed_at IS NULL;

-- 2) Remove legacy branding columns (matches prisma/migrations/20260322120000_remove_organization_branding_columns)
ALTER TABLE public.organizations DROP COLUMN IF EXISTS branding_company_name;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS branding_logo_url;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS branding_primary_color_hex;
