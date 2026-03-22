import { permanentRedirect } from "next/navigation";

/** Legacy URL — branding was removed app-wide. */
export default async function LegacySettingsBrandingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.saved === "1") q.set("saved", "1");
  if (sp.e) q.set("e", sp.e);
  const qs = q.toString();
  const suffix = qs ? `?${qs}` : "";
  permanentRedirect(`/settings/workspace${suffix}`);
}
