-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "last_matched_at" TIMESTAMP(3);
