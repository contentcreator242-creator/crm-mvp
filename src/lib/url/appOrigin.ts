/**
 * Canonical app origin for redirects (invites, emails, embeds).
 * Prefer request headers on Vercel/proxies; fall back to NEXT_PUBLIC_APP_URL.
 */
export function appOriginFromHeaders(h: { get(name: string): string | null }): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const forwardedProto = h.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}
