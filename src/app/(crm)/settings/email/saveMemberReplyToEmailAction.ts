"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";

export type SaveMemberReplyToEmailState =
  | null
  | { ok: true; message: string }
  | { ok: false; error: string };

const EmailSchema = z.string().email("Enter a valid email address.");

export async function saveMemberReplyToEmailAction(
  _prev: SaveMemberReplyToEmailState | null,
  formData: FormData,
): Promise<SaveMemberReplyToEmailState> {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) return { ok: false, error: "You must be signed in." };
  if (!orgId) return { ok: false, error: "Choose an organization." };

  const raw = formData.get("replyToEmail")?.toString() ?? "";
  const trimmed = raw.trim();

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  if (!trimmed) {
    await prisma.$executeRaw`
      DELETE FROM organization_member_email_preferences
      WHERE organization_id::text = ${organizationId}
        AND clerk_user_id = ${userId}
    `;
    revalidatePath("/settings/email");
    return { ok: true, message: "Reply-to cleared. Workspace fallback will be used if configured." };
  }

  const parsed = EmailSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const email = parsed.data.trim();

  await prisma.$executeRaw`
    INSERT INTO organization_member_email_preferences (
      id,
      organization_id,
      clerk_user_id,
      reply_to_email,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${organizationId}::uuid,
      ${userId},
      ${email},
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_id, clerk_user_id)
    DO UPDATE SET
      reply_to_email = EXCLUDED.reply_to_email,
      updated_at = NOW()
  `;

  revalidatePath("/settings/email");
  revalidatePath("/leads");

  return { ok: true, message: "Reply-to saved. Lead email replies will go to this address." };
}
