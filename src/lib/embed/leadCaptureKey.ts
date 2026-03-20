/** Strips trailing punctuation and extracts a UUID so pasted URLs like "...71ab5," still work. */
export function normalizeLeadCaptureKey(raw: string): string {
  const t = raw.trim().replace(/[,;)\]}\s]+$/g, "");
  const m = t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return (m?.[0] ?? t).trim();
}
