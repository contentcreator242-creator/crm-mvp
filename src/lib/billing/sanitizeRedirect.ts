/** Allow only same-origin path redirects (Clerk after-sign-in/up). */
export function sanitizeInternalPath(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return undefined;
  if (t.includes("://")) return undefined;
  return t;
}
