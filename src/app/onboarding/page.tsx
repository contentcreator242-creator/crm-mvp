import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ensureLeadCapturePublicKey,
  provisionOrganizationAfterUpsert,
} from "@/lib/auth/organization";
import { getPrisma } from "@/lib/db/prisma";
import { isOrganizationOnboardingComplete } from "@/lib/onboarding/organizationOnboarding";
import { getMemberReplyToEmail } from "@/lib/settings/memberReplyToEmail";
import { OnboardingWizard } from "./OnboardingWizard";

async function appOriginFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export default async function OnboardingPage() {
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
    update: {},
    select: { id: true, name: true },
  });

  await provisionOrganizationAfterUpsert(organizationRow.id);

  const done = await isOrganizationOnboardingComplete(prisma, organizationRow.id);
  if (done) redirect("/dashboard");

  const initialOrganizationName =
    organizationRow.name?.trim() || orgSlug?.trim() || "";
  const initialReplyEmail = (await getMemberReplyToEmail(prisma, organizationRow.id, userId)) ?? "";

  const leadCapturePublicKey = await ensureLeadCapturePublicKey(organizationRow.id);
  const origin = await appOriginFromRequest();
  const embedPath = `/embed/lead?key=${encodeURIComponent(leadCapturePublicKey)}`;
  const embedUrl = origin ? `${origin}${embedPath}` : embedPath;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700"></iframe>`;

  return (
    <div className="min-h-screen bg-[var(--adm-bg)]">
      <div className="border-b border-slate-200/80 bg-white/90 px-4 py-3 text-center text-xs text-slate-600">
        Finish these steps to unlock your workspace. You can change everything later in Settings.
      </div>
      <OnboardingWizard
        initialOrganizationName={initialOrganizationName}
        initialReplyEmail={initialReplyEmail}
        embedPath={embedPath}
        embedUrl={embedUrl}
        iframeCode={iframeCode}
      />
    </div>
  );
}
