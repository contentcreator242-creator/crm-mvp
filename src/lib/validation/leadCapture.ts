import { z } from "zod";

const optionalBool = z.preprocess((v) => {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  if (v === "" || v === null || v === undefined) return null;
  return v;
}, z.boolean().nullable().optional());

/** Public website / embed submissions: scoped to an organization via public key. */
export const PublicLeadCaptureInput = z.object({
  organizationPublicKey: z.string().uuid(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable().or(z.literal("")),
  companyName: z.string().max(180).optional().nullable().or(z.literal("")),
  requestedAmount: z.coerce.number().int().nonnegative().optional().nullable(),
  annualRevenue: z.coerce.number().int().nonnegative().optional().nullable(),
  timeTradingMonths: z.coerce.number().int().nonnegative().optional().nullable(),
  creditIssues: optionalBool,
  businessType: z.string().max(120).optional().nullable().or(z.literal("")),
  notes: z.string().max(5000).optional().nullable().or(z.literal("")),
  leadSource: z.string().max(100).optional().nullable().or(z.literal("")),
  turnstileToken: z.string().optional().nullable().or(z.literal("")),
  recaptchaToken: z.string().optional().nullable().or(z.literal("")),
});

export type PublicLeadCaptureInput = z.infer<typeof PublicLeadCaptureInput>;
