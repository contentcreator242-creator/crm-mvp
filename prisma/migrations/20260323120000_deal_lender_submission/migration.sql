-- CreateEnum
CREATE TYPE "DealSubmissionStatus" AS ENUM ('not_submitted', 'submitted', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "lender_id" TEXT,
ADD COLUMN "submission_status" "DealSubmissionStatus" NOT NULL DEFAULT 'not_submitted',
ADD COLUMN "submission_date" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "deals_lender_id_idx" ON "deals"("lender_id");
