import type { LeadActivityListItem } from "@/lib/leads/activity";

/** Fields we store on `email_sent` activity metadata */
export type EmailSentParsed = {
  recipient: string;
  subject: string;
  /** Prefer `metadata.sentAt`, else activity `createdAt` */
  sentAt: Date;
};

/**
 * Parse email_sent metadata for display. Returns null if not an email event or missing recipient.
 */
export function parseEmailSentFromActivity(
  event: Pick<LeadActivityListItem, "eventType" | "metadata" | "createdAt">,
): EmailSentParsed | null {
  if (event.eventType !== "email_sent") return null;
  return parseEmailSentMetadata(event.metadata, event.createdAt);
}

export function parseEmailSentMetadata(
  metadata: unknown,
  fallbackCreatedAt: Date,
): EmailSentParsed | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const recipient = typeof m.recipient === "string" ? m.recipient.trim() : "";
  if (!recipient) return null;
  const subjectRaw = typeof m.subject === "string" ? m.subject.trim() : "";
  const subject = subjectRaw.length ? subjectRaw : "—";

  let sentAt = fallbackCreatedAt;
  if (typeof m.sentAt === "string") {
    const d = new Date(m.sentAt);
    if (!Number.isNaN(d.getTime())) sentAt = d;
  }

  return { recipient, subject, sentAt };
}
