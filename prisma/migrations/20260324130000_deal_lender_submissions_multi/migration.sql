-- CreateEnum
CREATE TYPE "DealLenderSubmissionStatus" AS ENUM ('selected', 'submitted', 'approved', 'declined', 'funded');

-- CreateTable
CREATE TABLE "deal_lender_submissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "lender_id" TEXT NOT NULL,
    "status" "DealLenderSubmissionStatus" NOT NULL DEFAULT 'selected',
    "submitted_at" TIMESTAMP(3),
    "decision_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_lender_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_lender_submissions_deal_id_lender_id_key" ON "deal_lender_submissions"("deal_id", "lender_id");

-- CreateIndex
CREATE INDEX "deal_lender_submissions_organization_id_idx" ON "deal_lender_submissions"("organization_id");

-- CreateIndex
CREATE INDEX "deal_lender_submissions_deal_id_idx" ON "deal_lender_submissions"("deal_id");

-- AddForeignKey
ALTER TABLE "deal_lender_submissions" ADD CONSTRAINT "deal_lender_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_lender_submissions" ADD CONSTRAINT "deal_lender_submissions_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_lender_submissions" ADD CONSTRAINT "deal_lender_submissions_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy single-lender fields on deals (one row per deal that had a lender)
INSERT INTO "deal_lender_submissions" ("id", "organization_id", "deal_id", "lender_id", "status", "submitted_at", "decision_at", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    d."organization_id",
    d."id",
    d."lender_id",
    CASE d."submission_status"::text
        WHEN 'not_submitted' THEN 'selected'::"DealLenderSubmissionStatus"
        WHEN 'submitted' THEN 'submitted'::"DealLenderSubmissionStatus"
        WHEN 'approved' THEN 'approved'::"DealLenderSubmissionStatus"
        WHEN 'rejected' THEN 'declined'::"DealLenderSubmissionStatus"
        ELSE 'selected'::"DealLenderSubmissionStatus"
    END,
    CASE
        WHEN d."submission_status"::text IN ('submitted', 'approved', 'rejected') THEN d."submission_date"
        ELSE NULL
    END,
    CASE
        WHEN d."submission_status"::text IN ('approved', 'rejected') THEN d."submission_date"
        ELSE NULL
    END,
    d."created_at",
    d."updated_at"
FROM "deals" d
WHERE d."lender_id" IS NOT NULL
  AND d."organization_id" IS NOT NULL;
