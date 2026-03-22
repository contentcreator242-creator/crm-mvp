-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "onboarding_first_lead_at" TIMESTAMP(3),
ADD COLUMN "onboarding_first_lender_selection_at" TIMESTAMP(3),
ADD COLUMN "onboarding_first_deal_at" TIMESTAMP(3),
ADD COLUMN "onboarding_first_submission_tracked_at" TIMESTAMP(3);

-- Backfill from existing data so orgs that already completed the flow don't see the checklist again
UPDATE "organizations" o
SET "onboarding_first_lead_at" = s.min_c
FROM (
  SELECT "organization_id", MIN("created_at") AS min_c
  FROM "leads"
  GROUP BY "organization_id"
) s
WHERE o."id" = s."organization_id"
  AND o."onboarding_first_lead_at" IS NULL;

UPDATE "organizations" o
SET "onboarding_first_deal_at" = s.min_c
FROM (
  SELECT "organization_id", MIN("created_at") AS min_c
  FROM "deals"
  WHERE "organization_id" IS NOT NULL
  GROUP BY "organization_id"
) s
WHERE o."id" = s."organization_id"
  AND o."onboarding_first_deal_at" IS NULL;

UPDATE "organizations" o
SET "onboarding_first_lender_selection_at" = s.min_c
FROM (
  SELECT "organization_id", MIN("created_at") AS min_c
  FROM "deal_lender_submissions"
  GROUP BY "organization_id"
) s
WHERE o."id" = s."organization_id"
  AND o."onboarding_first_lender_selection_at" IS NULL;

UPDATE "organizations" o
SET "onboarding_first_submission_tracked_at" = s.min_c
FROM (
  SELECT "organization_id", MIN("updated_at") AS min_c
  FROM "deal_lender_submissions"
  WHERE
    "status"::text <> 'selected'
    OR ("notes" IS NOT NULL AND TRIM("notes") <> '')
    OR "submitted_at" IS NOT NULL
    OR "decision_at" IS NOT NULL
  GROUP BY "organization_id"
) s
WHERE o."id" = s."organization_id"
  AND o."onboarding_first_submission_tracked_at" IS NULL;
