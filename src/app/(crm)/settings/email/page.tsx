import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { getMemberReplyToEmail } from "@/lib/settings/memberReplyToEmail";
import { ContentCard, PageHeader } from "@/components/crm-shell";
import { MemberReplyToForm } from "./MemberReplyToForm";

export default async function EmailSettingsPage() {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const [saved, user] = await Promise.all([
    getMemberReplyToEmail(prisma, organizationId, userId),
    currentUser(),
  ]);

  const clerkPrimary =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;

  const envFallback = process.env.EMAIL_REPLY_TO?.trim() || null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Email"
        description="Where replies go when you message leads from the CRM (per user, per workspace)."
        eyebrow="Settings"
        actions={
          <>
            <Link href="/settings/email-templates" className="btn-secondary text-sm">
              Email templates
            </Link>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
          </>
        }
      />

      <ContentCard
        title="Lead email replies"
        description="Each team member can link their own inbox. Outbound mail is sent via Resend; Reply-To is set so conversations land with you."
        padding="md"
        className="border-l-4 border-l-slate-900"
      >
        <MemberReplyToForm
          defaultReplyTo={saved ?? ""}
          clerkEmailHint={clerkPrimary}
          envFallbackLabel={envFallback}
        />
      </ContentCard>
    </div>
  );
}
