import type { PrismaClient } from "@prisma/client";

/**
 * Reply-to address for lead emails for this member in this org.
 * Returns null if the user has not saved a preference.
 *
 * Uses `$queryRaw` instead of the Prisma delegate so this works even when the dev server
 * is still holding a Prisma singleton generated before `organization_member_email_preferences`
 * existed (delegate would be undefined until `prisma generate` + full restart).
 */
export async function getMemberReplyToEmail(
  prisma: Pick<PrismaClient, "$queryRaw">,
  organizationId: string,
  clerkUserId: string,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ reply_to_email: string }[]>`
    SELECT reply_to_email
    FROM organization_member_email_preferences
    WHERE organization_id::text = ${organizationId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;
  const v = rows[0]?.reply_to_email?.trim();
  return v?.length ? v : null;
}

/**
 * Resolves Reply-To for sending: saved user preference, then workspace fallback env.
 */
export function resolveReplyToForSend(
  memberReplyTo: string | null,
  envFallback: string | undefined,
): string | undefined {
  const fromMember = memberReplyTo?.trim();
  if (fromMember) return fromMember;
  const fromEnv = envFallback?.trim();
  return fromEnv || undefined;
}
