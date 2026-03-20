import { z } from "zod";

/** Stored on `Lead.status` (lowercase snake_case). */
export const LEAD_WORKFLOW_VALUES = [
  "new",
  "contacted",
  "in_progress",
  "submitted",
  "funded",
  "lost",
] as const;

export type LeadWorkflowStatus = (typeof LEAD_WORKFLOW_VALUES)[number];

export const LEAD_WORKFLOW_LABELS: Record<LeadWorkflowStatus, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In Progress",
  submitted: "Submitted",
  funded: "Funded",
  lost: "Lost",
};

export const LEAD_WORKFLOW_OPTIONS = LEAD_WORKFLOW_VALUES.map((value) => ({
  value,
  label: LEAD_WORKFLOW_LABELS[value],
}));

export const leadWorkflowStatusSchema = z.enum(LEAD_WORKFLOW_VALUES);

const LEGACY_STATUS_MAP: Record<string, LeadWorkflowStatus> = {
  /** Previous CRM edit form values */
  qualified: "in_progress",
  matched: "submitted",
};

/**
 * Map stored value to a supported workflow status (for display and form defaults).
 */
export function normalizeLeadWorkflowStatus(raw: string | null | undefined): LeadWorkflowStatus {
  const k = (raw ?? "new").toLowerCase().trim();
  if ((LEAD_WORKFLOW_VALUES as readonly string[]).includes(k)) {
    return k as LeadWorkflowStatus;
  }
  if (k in LEGACY_STATUS_MAP) return LEGACY_STATUS_MAP[k];
  return "new";
}

export function formatLeadStatusLabel(raw: string | null | undefined): string {
  return LEAD_WORKFLOW_LABELS[normalizeLeadWorkflowStatus(raw)];
}

/**
 * Badge colors: distinct per workflow step (reuses `crm-badge` utilities).
 */
export function leadWorkflowBadgeClass(raw: string | null | undefined): string {
  const status = normalizeLeadWorkflowStatus(raw);
  const variant: Record<LeadWorkflowStatus, string> = {
    new: "crm-badge-slate",
    contacted: "crm-badge-amber",
    in_progress: "crm-badge-violet",
    submitted: "crm-badge-blue",
    funded: "crm-badge-emerald",
    lost: "crm-badge-rose",
  };
  return `crm-badge ${variant[status]}`;
}
