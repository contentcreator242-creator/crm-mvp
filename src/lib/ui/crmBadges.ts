/**
 * Presentation-only: maps CRM status strings to badge color utility classes (see globals.css).
 */
const STATUS_TO_BADGE: Record<string, string> = {
  new: "crm-badge-slate",
  qualified: "crm-badge-blue",
  won: "crm-badge-emerald",
  lost: "crm-badge-rose",
  contacted: "crm-badge-amber",
  matched: "crm-badge-violet",
  todo: "crm-badge-amber",
  open: "crm-badge-slate",
  done: "crm-badge-emerald",
};

export function crmStatusBadgeClass(status: string): string {
  const key = (status || "").toLowerCase().trim();
  const variant = STATUS_TO_BADGE[key] ?? "crm-badge-muted";
  return `crm-badge ${variant}`;
}
