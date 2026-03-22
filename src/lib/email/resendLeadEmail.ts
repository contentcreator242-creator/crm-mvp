import { Resend } from "resend";

const EMAIL_ACCENT_HEX = "#2563EB";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendLeadEmailViaResendInput = {
  to: string;
  subject: string;
  textBody: string;
  /** Member preference, then env — see resolveReplyToForSend */
  replyTo?: string | undefined;
  /** Organization name for Resend “From” display name and HTML wrapper */
  organizationDisplayName?: string | undefined;
};

export type SendLeadEmailViaResendResult =
  | { ok: true; providerId: string | undefined }
  | { ok: false; error: string };

function extractEmailFromFromEnv(fromEnv: string): string {
  const m = fromEnv.match(/<([^>]+)>/);
  if (m) return m[1].trim();
  return fromEnv.trim();
}

function formatFromWithDisplayName(displayName: string, fromEnv: string): string {
  const email = extractEmailFromFromEnv(fromEnv);
  const safe = displayName.replace(/[<>"]/g, "").trim() || "Lendex";
  return `${safe} <${email}>`;
}

function buildLeadEmailHtml(textBody: string, organizationDisplayName: string): string {
  const escapedBody = escapeHtml(textBody);
  const headerBorder = `border-bottom:3px solid ${escapeHtml(EMAIL_ACCENT_HEX)};padding-bottom:12px;margin-bottom:16px;`;
  const footer = `<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">${escapeHtml(
    organizationDisplayName,
  )}</p>`;
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#0f172a;line-height:1.5;">
  <div style="${headerBorder}">
    <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(organizationDisplayName)}</p>
  </div>
  <div style="white-space:pre-wrap;">${escapedBody}</div>
  ${footer}
</div>`;
}

function buildLeadEmailText(textBody: string, organizationDisplayName: string): string {
  return `${textBody}\n\n—\n${organizationDisplayName}`;
}

/**
 * Sends a single transactional email via Resend.
 * Requires RESEND_API_KEY. Optional RESEND_FROM.
 * Reply-To: `input.replyTo` when provided, else EMAIL_REPLY_TO.
 */
export async function sendLeadEmailViaResend(
  input: SendLeadEmailViaResendInput,
): Promise<SendLeadEmailViaResendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Email is not configured (missing RESEND_API_KEY)." };
  }

  const fromEnv =
    process.env.RESEND_FROM?.trim() || "Lendex <onboarding@resend.dev>";
  const orgName = input.organizationDisplayName?.trim();
  const from = orgName
    ? formatFromWithDisplayName(orgName, fromEnv)
    : fromEnv;

  const replyTo =
    input.replyTo?.trim() || process.env.EMAIL_REPLY_TO?.trim();

  const resend = new Resend(apiKey);

  const html = orgName
    ? buildLeadEmailHtml(input.textBody, orgName)
    : `<pre style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap;">${escapeHtml(
        input.textBody,
      )}</pre>`;

  const text = orgName ? buildLeadEmailText(input.textBody, orgName) : input.textBody;

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    const message =
      typeof error.message === "string"
        ? error.message
        : "Resend rejected the message.";
    return { ok: false, error: message };
  }

  return { ok: true, providerId: data?.id };
}
