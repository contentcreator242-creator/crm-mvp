import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import {
  ensureLeadCapturePublicKey,
  provisionOrganizationAfterUpsert,
} from "@/lib/auth/organization";
import { LeadEmbedCopyButton } from "./LeadEmbedCopyButton";
import { ContentCard, PageHeader } from "@/components/crm-shell";

async function appOriginFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return fromEnv;
}

export default async function IntegrationsSettingsPage() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationRow = await prisma.organization.upsert({
    where: { clerkOrganizationId: orgId },
    create: {
      clerkOrganizationId: orgId,
      name: orgSlug ?? null,
    },
    update: {
      name: orgSlug ?? undefined,
    },
    select: { id: true },
  });

  await provisionOrganizationAfterUpsert(organizationRow.id);
  const leadCapturePublicKey = await ensureLeadCapturePublicKey(organizationRow.id);
  const origin = await appOriginFromRequest();
  const embedPath = `/embed/lead?key=${encodeURIComponent(leadCapturePublicKey)}`;
  const embedUrl = origin ? `${origin}${embedPath}` : embedPath;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700"></iframe>`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Integrations"
        description="Website lead capture, embeddable form, and workspace keys."
        eyebrow="Settings"
        actions={
          <>
            <Link href="/settings/email" className="btn-secondary text-sm">
              Email settings
            </Link>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
          </>
        }
      />

        <ContentCard
          title="Website lead capture"
          description="Public form and API use this link or key. Submissions create leads in this workspace and run lender matching."
          padding="md"
          className="border-l-4 border-l-slate-900"
        >
          <div className="space-y-4">
            <div>
              <p className="crm-field-label">Embed / share link</p>
              <p className="mt-1 break-all rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900">
                {embedUrl}
              </p>
            </div>
            <div>
              <p className="crm-field-label">Workspace key only</p>
              <p className="mt-1 break-all rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900">
                {leadCapturePublicKey}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              <Link href={embedPath} className="font-semibold text-slate-800 underline underline-offset-2">
                Preview embed form
              </Link>
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              Optional bot protection: set <code className="rounded bg-slate-100 px-1">RECAPTCHA_SECRET_KEY</code> and{" "}
              <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_RECAPTCHA_SITE_KEY</code>. Use{" "}
              <strong>v2 “I’m not a robot”</strong> by default, or add{" "}
              <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_RECAPTCHA_VERSION=v3</code> for invisible
              score-based checks (create a <strong>reCAPTCHA v3</strong> key pair in Google Admin). Optional:{" "}
              <code className="rounded bg-slate-100 px-1">RECAPTCHA_MIN_SCORE</code> (default 0.5),{" "}
              <code className="rounded bg-slate-100 px-1">RECAPTCHA_EXPECTED_ACTION</code> (default{" "}
              <code className="rounded bg-slate-100 px-1">lead_submit</code>). Or use Cloudflare Turnstile with{" "}
              <code className="rounded bg-slate-100 px-1">TURNSTILE_SECRET_KEY</code> — not both secrets at once;
              reCAPTCHA takes precedence when <code className="rounded bg-slate-100 px-1">RECAPTCHA_SECRET_KEY</code>{" "}
              is set. Register your embed domains in the reCAPTCHA admin console.
            </p>
          </div>
        </ContentCard>

        <ContentCard
          title="Iframe embed"
          description="Paste this HTML on your site. The form uses your workspace public key."
          padding="md"
          headerExtra={<LeadEmbedCopyButton text={iframeCode} />}
        >
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
            {iframeCode}
          </pre>
        </ContentCard>
    </div>
  );
}
