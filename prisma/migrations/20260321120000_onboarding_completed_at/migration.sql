-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

-- Existing workspaces at migration time: skip onboarding. New orgs created later keep NULL until they finish /onboarding.
UPDATE "organizations" SET "onboarding_completed_at" = CURRENT_TIMESTAMP WHERE "onboarding_completed_at" IS NULL;
