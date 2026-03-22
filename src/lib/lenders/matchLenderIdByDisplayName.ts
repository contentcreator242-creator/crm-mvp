/**
 * Map a lender name shown in match UI to an org lender row id.
 * Uses case-insensitive exact match, then normalized whitespace match.
 */

export function normalizeLenderDisplayName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function matchLenderIdFromDisplayName(
  lenders: { id: string; name: string }[],
  displayName: string,
): string | null {
  const trimmed = displayName.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const caseInsensitive = lenders.find((l) => l.name.trim().toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive.id;

  const target = normalizeLenderDisplayName(trimmed);
  const normalizedHit = lenders.find((l) => normalizeLenderDisplayName(l.name) === target);
  return normalizedHit?.id ?? null;
}
