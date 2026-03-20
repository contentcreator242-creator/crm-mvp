import type { PrismaClient } from "@prisma/client";

export const DEFAULT_EMBED_PRIMARY_HEX = "#2563EB";

export type OrganizationBrandingFields = {
  /** Resolved display name for UI / emails */
  displayName: string;
  brandingCompanyName: string | null;
  organizationName: string | null;
  logoUrl: string | null;
  primaryColorHex: string | null;
};

function rowToBranding(row: {
  name: string | null;
  branding_company_name: string | null;
  branding_logo_url: string | null;
  branding_primary_color_hex: string | null;
}): OrganizationBrandingFields {
  const organizationName = row.name?.trim() || null;
  const brandingCompanyName = row.branding_company_name?.trim() || null;
  const displayName =
    brandingCompanyName || organizationName || "Your company";
  return {
    displayName,
    brandingCompanyName,
    organizationName,
    logoUrl: row.branding_logo_url?.trim() || null,
    primaryColorHex: row.branding_primary_color_hex?.trim() || null,
  };
}

/**
 * Branding for embed + emails. Uses raw SQL so it works without relying on stale Prisma delegates.
 */
export async function getBrandingByLeadCaptureKey(
  prisma: Pick<PrismaClient, "$queryRaw">,
  publicKey: string,
): Promise<OrganizationBrandingFields | null> {
  if (!publicKey.trim()) return null;
  const rows = await prisma.$queryRaw<
    {
      name: string | null;
      branding_company_name: string | null;
      branding_logo_url: string | null;
      branding_primary_color_hex: string | null;
    }[]
  >`
    SELECT
      name,
      branding_company_name,
      branding_logo_url,
      branding_primary_color_hex
    FROM organizations
    WHERE lead_capture_public_key::text = ${publicKey}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? rowToBranding(row) : null;
}

export async function getBrandingForOrganization(
  prisma: Pick<PrismaClient, "$queryRaw">,
  organizationId: string,
): Promise<OrganizationBrandingFields | null> {
  const rows = await prisma.$queryRaw<
    {
      name: string | null;
      branding_company_name: string | null;
      branding_logo_url: string | null;
      branding_primary_color_hex: string | null;
    }[]
  >`
    SELECT
      name,
      branding_company_name,
      branding_logo_url,
      branding_primary_color_hex
    FROM organizations
    WHERE id::text = ${organizationId}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? rowToBranding(row) : null;
}

export function effectivePrimaryHex(primary: string | null | undefined): string {
  const v = (primary ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  return DEFAULT_EMBED_PRIMARY_HEX;
}

/** Slightly darker for hover (simple mix toward black). */
export function darkerHex(hex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return "#1d4ed8";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (n: number) => Math.round(n * 0.85);
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g).toString(16).padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}
