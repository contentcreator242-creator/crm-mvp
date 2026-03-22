-- Optional one-time backfill when you used `prisma db push` instead of `prisma migrate deploy`.
-- This marks every row that still has NULL onboarding as already onboarded (skips the wizard).
-- Only run if you want **all current** workspaces to skip onboarding (e.g. right after adding the column,
-- before new orgs are created). Do not run if new orgs may already exist with NULL = “needs onboarding”.
UPDATE organizations
SET onboarding_completed_at = NOW()
WHERE onboarding_completed_at IS NULL;
