"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { sendWelcomeEmailViaResend } from "@/lib/email/resendWelcomeEmail";
import {
  isMissingOnboardingColumnError,
  missingOnboardingColumnUserMessage,
} from "@/lib/onboarding/organizationOnboarding";

const EmailSchema = z.string().email("Enter a valid email address.");

export async function saveOnboardingStep1Action(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) return { ok: false, error: "You must be signed in." };
  if (!orgId) return { ok: false, error: "Choose an organization." };

  const companyRaw = (formData.get("organizationName")?.toString() ?? "").trim();
  if (companyRaw.length === 0) {
    return { ok: false, error: "Organization name is required." };
  }
  const name = companyRaw.slice(0, 120);

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { name },
    select: { id: true },
  });

  const replyRaw = (formData.get("replyToEmail")?.toString() ?? "").trim();
  if (!replyRaw) {
    await prisma.$executeRaw`
      DELETE FROM organization_member_email_preferences
      WHERE organization_id::text = ${organizationId}
        AND clerk_user_id = ${userId}
    `;
  } else {
    const parsed = EmailSchema.safeParse(replyRaw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
    const email = parsed.data;
    await prisma.$executeRaw`
      INSERT INTO organization_member_email_preferences (
        id,
        organization_id,
        clerk_user_id,
        reply_to_email,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${organizationId}::uuid,
        ${userId},
        ${email},
        NOW(),
        NOW()
      )
      ON CONFLICT (organization_id, clerk_user_id)
      DO UPDATE SET
        reply_to_email = EXCLUDED.reply_to_email,
        updated_at = NOW()
    `;
  }

  revalidatePath("/onboarding");
  revalidatePath("/settings/workspace");
  revalidatePath("/settings/email");
  revalidatePath("/embed/lead");
  return { ok: true };
}

export async function completeOnboardingAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) return { ok: false, error: "You must be signed in." };
  if (!orgId) return { ok: false, error: "Choose an organization." };

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const before = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { onboardingCompletedAt: true },
  });

  /** Idempotent: refresh / double-submit does not re-send welcome or re-touch completion semantics. */
  if (before?.onboardingCompletedAt != null) {
    return { ok: true };
  }

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { onboardingCompletedAt: new Date() },
      select: { id: true },
    });
  } catch (e) {
    if (isMissingOnboardingColumnError(e)) {
      return { ok: false, error: missingOnboardingColumnUserMessage() };
    }
    throw e;
  }

  /**
   * Welcome email: first time this Clerk user completes workspace onboarding.
   * Deduped via `user_welcome_emails` so the same user never gets two welcomes from retries.
   */
  try {
    const already = await prisma.userWelcomeEmailLog.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (already) {
      console.info("[welcome-email] skip already_sent", { clerkUserId: userId });
    } else {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const primaryId = user.primaryEmailAddressId;
      const primary =
        user.emailAddresses.find((a) => a.id === primaryId) ?? user.emailAddresses[0];
      const to = primary?.emailAddress?.trim();
      if (!to) {
        console.warn("[welcome-email] skip no_email", { clerkUserId: userId });
      } else {
        const sendResult = await sendWelcomeEmailViaResend(to);
        if (sendResult.ok) {
          await prisma.userWelcomeEmailLog.create({
            data: {
              clerkUserId: userId,
              resendMessageId: sendResult.providerId ?? null,
            },
          });
          console.info("[welcome-email] sent", {
            clerkUserId: userId,
            to,
            providerId: sendResult.providerId,
          });
        } else {
          console.warn("[welcome-email] send_failed", {
            clerkUserId: userId,
            to,
            error: sendResult.error,
          });
        }
      }
    }
  } catch (welcomeErr) {
    console.warn("[welcome-email] unexpected_error", { clerkUserId: userId, welcomeErr });
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  return { ok: true };
}
