-- CreateTable
CREATE TABLE "user_welcome_emails" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resend_message_id" TEXT,

    CONSTRAINT "user_welcome_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_welcome_emails_clerk_user_id_key" ON "user_welcome_emails"("clerk_user_id");
