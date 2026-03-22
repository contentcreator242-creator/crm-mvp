/**
 * Read env vars using dynamic property access so the value is resolved at runtime on the server.
 *
 * `process.env.STRIPE_PRICE_ID` can be inlined at **build** time in some Next.js bundles; if the
 * variable was missing during `next build` (or only added in Vercel after a deploy), the bundled
 * code can keep `undefined` even though Vercel injects it at **runtime**. `Reflect.get` avoids that
 * static replacement. Always **redeploy** after adding/changing server env vars in Vercel.
 */
export function readServerEnvTrimmed(name: string): string | undefined {
  const raw = Reflect.get(process.env, name);
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}
