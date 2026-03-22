import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const MIGRATION_HINT =
  "Apply database migrations (e.g. npx prisma migrate deploy) so column onboarding_completed_at exists.";

/**
 * Onboarding gate for CRM routes.
 * If the DB has not been migrated yet, we treat the org as complete so the app stays usable,
 * and log a warning (completeOnboarding will still fail until migrations run).
 */
export async function isOrganizationOnboardingComplete(
  prisma: Pick<PrismaClient, "organization">,
  organizationId: string,
): Promise<boolean> {
  try {
    const row = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { onboardingCompletedAt: true },
    });
    return row?.onboardingCompletedAt != null;
  } catch (e) {
    if (isMissingOnboardingColumnError(e)) {
      console.warn(`[onboarding] ${MIGRATION_HINT}`);
      return true;
    }
    throw e;
  }
}

export function isMissingOnboardingColumnError(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;
  /** Prisma: column missing in DB (message often shows `(not available)` instead of the name). */
  if (e.code === "P2022") return true;
  const msg = e.message.toLowerCase();
  return msg.includes("onboarding_completed_at") || msg.includes("42703");
}

export function missingOnboardingColumnUserMessage(): string {
  return MIGRATION_HINT;
}
