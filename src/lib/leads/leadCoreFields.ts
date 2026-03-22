import type { Lead } from "@prisma/client";
import { z } from "zod";
import {
  leadWorkflowStatusSchema,
  normalizeLeadWorkflowStatus,
} from "@/lib/leads/leadWorkflowStatus";

/** Default values for manual lead create/edit forms (stringified numbers for inputs). */
export type LeadCoreFormDefaults = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  requestedAmount?: string;
  annualRevenue?: string;
  timeTradingMonths?: string;
  creditIssues?: "" | "true" | "false";
  businessType?: string;
  status?: string;
  notes?: string;
};

/** Optional whole non-negative integers (aligned with public lead capture / matching). */
export const optionalNonNegIntFromFormString = z
  .string()
  .optional()
  .transform((s) => (s == null ? "" : String(s).trim()))
  .pipe(
    z.union([
      z.literal("").transform(() => undefined as number | undefined),
      z
        .string()
        .regex(/^\d+$/, "Use a whole number (0 or greater)")
        .transform((s) => parseInt(s, 10))
        .pipe(z.number().int().nonnegative()),
    ]),
  );

export const creditIssuesFromForm = z
  .union([z.literal(""), z.literal("true"), z.literal("false")])
  .transform((v) => {
    if (v === "") return null as boolean | null;
    return v === "true";
  });

/**
 * Shared rules for manual lead create/edit — same fields as `Lead` core finance + contact columns.
 */
export const leadCoreFieldsSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(180).optional(),
  requestedAmount: optionalNonNegIntFromFormString,
  annualRevenue: optionalNonNegIntFromFormString,
  timeTradingMonths: optionalNonNegIntFromFormString,
  creditIssues: creditIssuesFromForm,
  businessType: z
    .string()
    .max(120)
    .optional()
    .transform((s) => (s == null || s.trim() === "" ? undefined : s.trim())),
  status: leadWorkflowStatusSchema,
  notes: z.string().max(5000).optional(),
});

export type LeadCoreFieldsParsed = z.infer<typeof leadCoreFieldsSchema>;

export function formDataToLeadCorePayload(formData: FormData) {
  return {
    firstName: formData.get("firstName")?.toString()?.trim(),
    lastName: formData.get("lastName")?.toString()?.trim() || undefined,
    email: formData.get("email")?.toString()?.trim() || undefined,
    phone: formData.get("phone")?.toString()?.trim() || undefined,
    companyName: formData.get("companyName")?.toString()?.trim() || undefined,
    requestedAmount: formData.get("requestedAmount")?.toString(),
    annualRevenue: formData.get("annualRevenue")?.toString(),
    timeTradingMonths: formData.get("timeTradingMonths")?.toString(),
    creditIssues: formData.get("creditIssues")?.toString() ?? "",
    businessType: formData.get("businessType")?.toString()?.trim() || undefined,
    status: normalizeLeadWorkflowStatus(formData.get("status")?.toString()),
    notes: formData.get("notes")?.toString()?.trim() || undefined,
  };
}

export function parseLeadCoreFormData(formData: FormData) {
  return leadCoreFieldsSchema.safeParse(formDataToLeadCorePayload(formData));
}

export function collectLeadFieldErrors(err: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && out[key] == null) {
      out[key] = issue.message;
    }
  }
  return out;
}

/** Maps parsed core fields to Prisma `Lead` write shape (create or update). */
export function toLeadPrismaData(parsed: LeadCoreFieldsParsed) {
  return {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: parsed.email,
    phone: parsed.phone,
    companyName: parsed.companyName,
    requestedAmount: parsed.requestedAmount ?? null,
    annualRevenue: parsed.annualRevenue ?? null,
    timeTradingMonths: parsed.timeTradingMonths ?? null,
    creditIssues: parsed.creditIssues,
    businessType: parsed.businessType ?? null,
    status: parsed.status,
    notes: parsed.notes,
  };
}

/** Map a persisted `Lead` to form defaults for edit prefill. */
export function leadToCoreFormDefaults(lead: Lead): LeadCoreFormDefaults {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    companyName: lead.companyName ?? "",
    requestedAmount: lead.requestedAmount != null ? String(lead.requestedAmount) : "",
    annualRevenue: lead.annualRevenue != null ? String(lead.annualRevenue) : "",
    timeTradingMonths: lead.timeTradingMonths != null ? String(lead.timeTradingMonths) : "",
    creditIssues:
      lead.creditIssues === true ? "true" : lead.creditIssues === false ? "false" : "",
    businessType: lead.businessType ?? "",
    status: normalizeLeadWorkflowStatus(lead.status),
    notes: lead.notes ?? "",
  };
}
