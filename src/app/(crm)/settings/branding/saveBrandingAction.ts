"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { resolveOrganizationId } from "@/lib/auth/organization";

const HexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a hex like #2563EB");

export async function saveBrandingAction(formData: FormData) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/organization/create");

  const prisma = getPrisma();
  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  const companyRaw = (formData.get("brandingCompanyName")?.toString() ?? "").trim();
  const brandingCompanyName = companyRaw.length > 0 ? companyRaw.slice(0, 120) : null;

  const logoRaw = (formData.get("brandingLogoUrl")?.toString() ?? "").trim();
  let brandingLogoUrl: string | null = null;
  if (logoRaw.length > 0) {
    const u = z.string().url().safeParse(logoRaw);
    if (!u.success) {
      redirect("/settings/branding?e=" + encodeURIComponent("Logo must be a valid public image URL."));
    }
    brandingLogoUrl = logoRaw.slice(0, 2000);
  }

  const hexRaw = (formData.get("brandingPrimaryColorHex")?.toString() ?? "").trim();
  const hexParsed = HexSchema.safeParse(hexRaw || "#2563EB");
  if (!hexParsed.success) {
    redirect(
      "/settings/branding?e=" + encodeURIComponent(hexParsed.error.issues[0]?.message ?? "Invalid color"),
    );
  }
  const brandingPrimaryColorHex = hexParsed.data;

  await prisma.$executeRaw`
    UPDATE organizations
    SET
      branding_company_name = ${brandingCompanyName},
      branding_logo_url = ${brandingLogoUrl},
      branding_primary_color_hex = ${brandingPrimaryColorHex},
      updated_at = NOW()
    WHERE id::text = ${organizationId}
  `;

  revalidatePath("/settings/branding");
  revalidatePath("/embed/lead");
  revalidatePath("/leads");
  redirect("/settings/branding?saved=1");
}
