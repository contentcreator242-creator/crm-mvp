"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { deleteCustomLenderForOrganization } from "@/lib/lenders/lenderQueries";

const ALLOWED_REDIRECT = new Set<string>(["/lenders", "/dashboard"]);

export async function deleteOrganizationLender(formData: FormData) {
  const { userId: uid, orgId: oid, orgSlug: slug } = await auth();
  if (!uid) redirect("/sign-in");
  if (!oid) redirect("/organization/create");

  const lenderId = formData.get("lenderId")?.toString()?.trim();
  if (!lenderId) redirect("/lenders");

  const rawNext = formData.get("redirectTo")?.toString();
  const next = rawNext && ALLOWED_REDIRECT.has(rawNext) ? rawNext : "/lenders";

  const prismaInner = getPrisma();
  const orgIdInner = await resolveOrganizationId(oid, slug ?? null);

  await deleteCustomLenderForOrganization(prismaInner, orgIdInner, lenderId);

  revalidatePath("/lenders");
  revalidatePath("/dashboard");

  redirect(next);
}
