/**
 * Simple 1:1 templates for the lead email composer (not campaigns).
 * `{{firstName}}` is replaced in the UI when a template is selected.
 */
export type LeadEmailTemplateId = "initial_outreach" | "request_info" | "follow_up";

export type LeadEmailTemplate = {
  id: LeadEmailTemplateId;
  label: string;
  subject: string;
  body: string;
};

export const LEAD_EMAIL_TEMPLATES: readonly LeadEmailTemplate[] = [
  {
    id: "initial_outreach",
    label: "Initial outreach",
    subject: "Following up on your funding enquiry",
    body: `Hi {{firstName}},

Thanks for your interest. I'd like to learn a bit more about your business and how we can help with funding options that fit your situation.

Could you let me know a good time for a short call this week?

Best regards`,
  },
  {
    id: "request_info",
    label: "Request more information",
    subject: "A few details to move forward",
    body: `Hi {{firstName}},

To progress your enquiry, could you share a few more details?

• Approximate monthly revenue / turnover
• How long you've been trading
• The amount you're looking to borrow and intended use

Once I have this, I can outline suitable next steps.

Thanks`,
  },
  {
    id: "follow_up",
    label: "Follow-up",
    subject: "Checking in",
    body: `Hi {{firstName}},

Just checking in on my last message — happy to answer any questions or jump on a quick call when convenient.

Let me know what works best for you.

Best`,
  },
] as const;

export function applyLeadEmailTemplatePlaceholders(
  text: string,
  firstName: string,
): string {
  const safe = firstName.trim() || "there";
  return text.replaceAll("{{firstName}}", safe);
}
