import { getPrisma } from "@/lib/db/prisma";
import { normalizeLeadCaptureKey } from "@/lib/embed/leadCaptureKey";
import { getBrandingByLeadCaptureKey } from "@/lib/settings/organizationBranding";
import EmbedLeadForm from "./EmbedLeadForm";

export default async function EmbedLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const key = normalizeLeadCaptureKey((await searchParams).key ?? "");
  const prisma = getPrisma();
  const branding = key ? await getBrandingByLeadCaptureKey(prisma, key) : null;

  return (
    <div
      className="min-h-screen bg-slate-100/90 px-4 py-6 font-sans antialiased sm:px-6 sm:py-10"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
          <EmbedLeadForm branding={branding} />
        </div>
      </div>
    </div>
  );
}
