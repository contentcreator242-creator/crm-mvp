"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveOrganizationId } from "@/lib/auth/organization";
import { createOrganizationCheckoutSession } from "@/lib/billing/createOrganizationCheckoutSession";

export async function startSubscriptionCheckoutAction(): Promise<void> {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/subscribe");
  }
  if (!orgId) {
    redirect("/organization/create");
  }

  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);
  const result = await createOrganizationCheckoutSession(organizationId);

  if (!result.ok) {
    redirect(`/subscribe?error=${encodeURIComponent(result.error)}`);
  }

  redirect(result.url);
}
