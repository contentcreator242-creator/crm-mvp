"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";

export async function saveOrganizationNameAction(formData: FormData) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const raw = (formData.get("organizationName")?.toString() ?? "").trim();
  const name = raw.length > 0 ? raw.slice(0, 120) : null;

  /** Narrow `select` so Prisma does not RETURNING missing columns (e.g. `onboarding_completed_at` before migrate). */
  await prisma.organization.update({
    where: { id: organizationId },
    data: { name },
    select: { id: true },
  });

  revalidateWorkspacePaths();
  redirect("/settings/workspace?saved=1");
}

function revalidateWorkspacePaths() {
  revalidatePath("/settings/workspace");
  revalidatePath("/embed/lead");
  revalidatePath("/leads");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/deals");
  revalidatePath("/tasks");
  revalidatePath("/lenders");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/", "layout");
}
