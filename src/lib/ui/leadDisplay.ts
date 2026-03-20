/** Whole USD amounts as stored on Lead / LeadSubmission (dollars, not cents). */
export function formatUsdWhole(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCreditIssues(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

/** Latest capture submission's source, or CRM when none (manual lead). */
export function leadSourceSummary(
  submissions: { leadSource: string | null }[] | undefined | null,
): string {
  const latest = submissions?.[0];
  if (!latest) return "CRM";
  const raw = (latest.leadSource ?? "").trim();
  if (!raw) return "Website";
  if (raw.toLowerCase() === "embed") return "Website embed";
  return raw;
}
