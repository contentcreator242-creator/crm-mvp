-- Drop optional branding columns (logo, marketing name override, primary color). Organization display uses `name` only.
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "branding_company_name";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "branding_logo_url";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "branding_primary_color_hex";
