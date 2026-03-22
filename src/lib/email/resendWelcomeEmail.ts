import { Resend } from "resend";

const ACCENT = "#2563EB";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const WELCOME_SUBJECT = "Welcome to Lendex";

function buildWelcomeText(): string {
  return `Thanks for joining Lendex.

Lendex helps business finance teams match leads to the right lenders, track multi-lender submissions, and run deal workflow in one workspace.

Suggested next steps:
• Complete onboarding in the app if you have not already
• Add your first lead (manually or via your embedded lead form)
• Set up your embedded lead form under Settings → Integrations

We're glad you're here.

— The Lendex team`;
}

function buildWelcomeHtml(): string {
  const steps = [
    "Complete onboarding in the app if you have not already",
    "Add your first lead (manually or via your embedded lead form)",
    "Set up your embedded lead form under Settings → Integrations",
  ];
  const list = steps.map((s) => `<li style="margin:6px 0;">${escapeHtml(s)}</li>`).join("");
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#0f172a;line-height:1.55;max-width:560px;">
  <p style="margin:0 0 16px;border-bottom:3px solid ${ACCENT};padding-bottom:12px;font-size:18px;font-weight:600;color:#0f172a;">Welcome to Lendex</p>
  <p style="margin:0 0 16px;">Thanks for joining. We are glad you are here.</p>
  <p style="margin:0 0 12px;">Lendex helps business finance teams <strong>match leads to lenders</strong>, <strong>track multi-lender submissions</strong>, and <strong>run deal workflow</strong> in one workspace.</p>
  <p style="margin:0 0 8px;font-weight:600;">Suggested next steps</p>
  <ul style="margin:0 0 20px;padding-left:20px;color:#334155;">${list}</ul>
  <p style="margin:0;font-size:13px;color:#64748b;">— The Lendex team</p>
</div>`;
}

export type SendWelcomeEmailViaResendResult =
  | { ok: true; providerId: string | undefined }
  | { ok: false; error: string };

/**
 * Transactional welcome email via Resend (same env as lead emails: RESEND_API_KEY, RESEND_FROM).
 */
export async function sendWelcomeEmailViaResend(to: string): Promise<SendWelcomeEmailViaResendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Email is not configured (missing RESEND_API_KEY)." };
  }

  const from = process.env.RESEND_FROM?.trim() || "Lendex <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: WELCOME_SUBJECT,
    text: buildWelcomeText(),
    html: buildWelcomeHtml(),
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    const message =
      typeof error.message === "string" ? error.message : "Resend rejected the message.";
    return { ok: false, error: message };
  }

  return { ok: true, providerId: data?.id };
}
