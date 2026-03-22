import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  provisionOrganizationAfterUpsert,
  resolveOrganizationId,
} from "@/lib/auth/organization";
import { CrmAppShell } from "@/components/crm-shell/CrmAppShell";
import { getPrisma } from "@/lib/db/prisma";
import { isOrganizationOnboardingComplete } from "@/lib/onboarding/organizationOnboarding";
import { getOrganizationNameById, workspaceDisplayLabel } from "@/lib/settings/organizationName";

/** Fresh workspace label for the shell — avoid stale RSC cache. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmRouteLayout({ children }: { children: React.ReactNode }) {
  noStore();
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  await provisionOrganizationAfterUpsert(organizationId);

  const onboardingDone = await isOrganizationOnboardingComplete(prisma, organizationId);
  if (!onboardingDone) {
    redirect("/onboarding");
  }

  const name = await getOrganizationNameById(prisma, organizationId);
  const workspaceDisplayName = workspaceDisplayLabel(name);

  return (
    <CrmAppShell workspaceDisplayName={workspaceDisplayName}>
      {children}
    </CrmAppShell>
  );
}
