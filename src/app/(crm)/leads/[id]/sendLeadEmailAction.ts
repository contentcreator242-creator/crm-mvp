"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createLeadActivity } from "@/lib/leads/activity";
import { sendLeadEmailViaResend } from "@/lib/email/resendLeadEmail";
import {
  getMemberReplyToEmail,
  resolveReplyToForSend,
} from "@/lib/settings/memberReplyToEmail";
import { getOrganizationNameById, workspaceDisplayLabel } from "@/lib/settings/organizationName";

const SendEmailFormSchema = z.object({
  leadId: z.string().uuid(),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Message is required").max(100_000),
});

export type SendLeadEmailState =
  | null
  | { ok: true; message: string }
  | { ok: false; error: string };

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export async function sendLeadEmailAction(
  _prev: SendLeadEmailState | null,
  formData: FormData,
): Promise<SendLeadEmailState> {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) return { ok: false, error: "You must be signed in." };
  if (!orgId) return { ok: false, error: "Choose an organization to send email." };

  const parsed = SendEmailFormSchema.safeParse({
    leadId: formData.get("leadId")?.toString(),
    subject: formData.get("subject")?.toString() ?? "",
    body: formData.get("body")?.toString() ?? "",
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.subject?.[0] ?? first.body?.[0] ?? first.leadId?.[0] ?? "Invalid form.";
    return { ok: false, error: msg };
  }

  const { leadId, subject, body } = parsed.data;

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true, email: true, organizationId: true },
  });

  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  const recipientRaw = formData.get("recipient")?.toString() ?? "";
  const recipient = recipientRaw.trim();
  if (!recipient) {
    return { ok: false, error: "Recipient email is required." };
  }

  const emailCheck = z.string().email();
  const toParsed = emailCheck.safeParse(recipient);
  if (!toParsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!lead.email?.trim()) {
    return { ok: false, error: "This lead has no email on file." };
  }

  if (normalizeEmail(recipient) !== normalizeEmail(lead.email)) {
    return { ok: false, error: "Recipient must match the lead’s email address." };
  }

  const memberReplyTo = await getMemberReplyToEmail(prisma, organizationId, userId);
  const replyToUsed = resolveReplyToForSend(memberReplyTo, process.env.EMAIL_REPLY_TO);

  const orgName = await getOrganizationNameById(prisma, organizationId);
  const organizationDisplayName = workspaceDisplayLabel(orgName);

  const sentAt = new Date();
  const sendResult = await sendLeadEmailViaResend({
    to: recipient,
    subject,
    textBody: body,
    replyTo: replyToUsed,
    organizationDisplayName,
  });

  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }

  const metadata = {
    recipient,
    subject,
    sentAt: sentAt.toISOString(),
    organizationId: lead.organizationId,
    leadId: lead.id,
    replyTo: replyToUsed ?? null,
  };

  await createLeadActivity(prisma, {
    organizationId: lead.organizationId,
    leadId: lead.id,
    eventType: "email_sent",
    description: `Email sent to ${recipient}: ${subject}`,
    metadata,
  });

  revalidatePath(`/leads/${leadId}`);

  return { ok: true, message: "Email sent." };
}
