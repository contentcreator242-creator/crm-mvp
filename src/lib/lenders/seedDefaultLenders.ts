import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import {
  DEFAULT_UK_LENDER_DEFINITIONS,
  DEFAULT_UK_LENDER_SEED_NAMES,
  type DefaultLenderDefinition,
} from "./defaultLenderCatalog";
import { lenderSchemaIsFull } from "./lenderQueries";

function normLenderName(name: string): string {
  return name.trim().toLowerCase();
}

async function organizationHasDefaultLendersFlagColumn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'default_lenders_seeded_at'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function insertOneLenderLegacyRaw(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  organizationId: string,
  def: DefaultLenderDefinition,
  lastReviewedAt: Date,
): Promise<void> {
  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO lenders (
      id,
      organization_id,
      name,
      min_annual_revenue,
      min_time_trading_months,
      min_loan_amount,
      max_loan_amount,
      accepts_adverse_credit,
      allowed_industries,
      excluded_industries,
      created_at,
      updated_at
    ) VALUES (
      ${id}::uuid,
      ${organizationId}::uuid,
      ${def.name},
      ${def.minAnnualRevenue},
      ${def.minTimeTradingMonths},
      ${def.minLoanAmount},
      ${def.maxLoanAmount},
      ${def.acceptsAdverseCredit},
      NULL,
      NULL,
      ${lastReviewedAt},
      ${lastReviewedAt}
    )
  `;
}

async function insertOneLenderExtendedRaw(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  organizationId: string,
  def: DefaultLenderDefinition,
  lastReviewedAt: Date,
): Promise<void> {
  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO lenders (
      id,
      organization_id,
      name,
      is_active,
      source_url,
      last_reviewed_at,
      criteria_confidence,
      min_annual_revenue,
      min_monthly_revenue,
      min_time_trading_months,
      min_loan_amount,
      max_loan_amount,
      accepts_adverse_credit,
      requires_personal_guarantee,
      max_loan_as_revenue_multiple,
      allowed_industries,
      excluded_industries,
      notes,
      is_default_seeded,
      is_user_modified,
      created_at,
      updated_at
    ) VALUES (
      ${id}::uuid,
      ${organizationId}::uuid,
      ${def.name},
      ${def.isActive},
      ${def.sourceUrl},
      ${lastReviewedAt},
      ${def.criteriaConfidence},
      ${def.minAnnualRevenue},
      ${def.minMonthlyRevenue},
      ${def.minTimeTradingMonths},
      ${def.minLoanAmount},
      ${def.maxLoanAmount},
      ${def.acceptsAdverseCredit},
      ${def.requiresPersonalGuarantee},
      ${def.maxLoanAsRevenueMultiple},
      NULL,
      NULL,
      ${def.notes},
      true,
      false,
      ${lastReviewedAt},
      ${lastReviewedAt}
    )
  `;
}

/** Pre–db-push schema: only original `lenders` columns from early MVP. */
async function insertDefaultLendersLegacyRaw(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  organizationId: string,
  lastReviewedAt: Date,
): Promise<void> {
  for (const def of DEFAULT_UK_LENDER_DEFINITIONS) {
    await insertOneLenderLegacyRaw(tx, organizationId, def, lastReviewedAt);
  }
}

/** Current Prisma schema: full lender row. */
async function insertDefaultLendersExtendedRaw(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  organizationId: string,
  lastReviewedAt: Date,
): Promise<void> {
  for (const def of DEFAULT_UK_LENDER_DEFINITIONS) {
    await insertOneLenderExtendedRaw(tx, organizationId, def, lastReviewedAt);
  }
}

async function countFeaturedLendersCaseInsensitive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  organizationId: string,
): Promise<number> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint AS c
     FROM lenders
     WHERE organization_id::text = $1
       AND lower(trim(name)) IN (${DEFAULT_UK_LENDER_SEED_NAMES.map(
         (n) => `'${n.replace(/'/g, "''").toLowerCase()}'`,
       ).join(", ")})`,
    organizationId,
  )) as { c: bigint }[];
  return Number(rows[0]?.c ?? 0);
}

async function countSeededLendersByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  organizationId: string,
): Promise<number> {
  return countFeaturedLendersCaseInsensitive(tx, organizationId);
}

/**
 * After the one-time seed flag is set, featured lenders can still be missing (deleted, failed insert,
 * or legacy DB with "Iwoca" vs "iwoca" miscounts). Inserts any missing featured row.
 */
export async function ensureFeaturedLendersPresent(organizationId: string): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const orgRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id FROM organizations WHERE id::text = ${organizationId} LIMIT 1
    `;
    if (!orgRows[0]) return;

    const extended = await lenderSchemaIsFull(tx);
    const nameRows = await tx.$queryRaw<{ name: string }[]>`
      SELECT name FROM lenders WHERE organization_id::text = ${organizationId}
    `;
    const have = new Set(nameRows.map((r) => normLenderName(r.name)));

    const lastReviewedAt = new Date();

    for (const def of DEFAULT_UK_LENDER_DEFINITIONS) {
      const key = normLenderName(def.name);
      if (have.has(key)) continue;

      if (extended) {
        await insertOneLenderExtendedRaw(tx, organizationId, def, lastReviewedAt);
      } else {
        await insertOneLenderLegacyRaw(tx, organizationId, def, lastReviewedAt);
      }
      have.add(key);
    }
  });
}

/** Apply catalog if row was never edited, or default-seeded but never got full details. */
function shouldApplyCatalogSync(row: {
  isUserModified: boolean;
  isDefaultSeeded: boolean;
  sourceUrl: string | null;
  criteriaConfidence: string | null;
}): boolean {
  if (!row.isUserModified) return true;
  if (!row.isDefaultSeeded) return false;
  return row.sourceUrl == null && row.criteriaConfidence == null;
}

/**
 * Legacy DB (no `is_active` column): align core numeric criteria via SQL so matching works.
 */
async function syncFeaturedLendersLegacySql(
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
): Promise<void> {
  const now = new Date();
  for (const def of DEFAULT_UK_LENDER_DEFINITIONS) {
    await tx.$executeRaw`
      UPDATE lenders SET
        min_annual_revenue = ${def.minAnnualRevenue},
        min_time_trading_months = ${def.minTimeTradingMonths},
        min_loan_amount = ${def.minLoanAmount},
        max_loan_amount = ${def.maxLoanAmount},
        accepts_adverse_credit = ${def.acceptsAdverseCredit},
        updated_at = ${now}
      WHERE organization_id::text = ${organizationId}
        AND lower(trim(name)) = ${normLenderName(def.name)}
    `;
  }
}

/**
 * Inserts the three featured UK lenders once per organization (when seed flag allows).
 * Uses raw SQL (works with stale `prisma generate`). Picks legacy vs extended `INSERT`
 * based on whether `lenders.is_active` exists (run `npx prisma db push` for full columns).
 */
export async function ensureDefaultLendersForOrganization(organizationId: string): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    /** Serialize concurrent first-seed attempts so we don't insert duplicate featured rows. */
    await tx.$executeRaw`
      SELECT id FROM organizations WHERE id::text = ${organizationId} FOR UPDATE
    `;

    const hasFlagCol = await organizationHasDefaultLendersFlagColumn(tx);

    if (hasFlagCol) {
      const flagRows = await tx.$queryRaw<{ seeded: Date | null }[]>`
        SELECT default_lenders_seeded_at AS seeded
        FROM organizations
        WHERE id::text = ${organizationId}
        LIMIT 1
      `;
      if (!flagRows[0]) return;
      if (flagRows[0].seeded != null) return;
    } else {
      const already = await countSeededLendersByName(tx, organizationId);
      if (already >= DEFAULT_UK_LENDER_DEFINITIONS.length) return;
    }

    const lastReviewedAt = new Date();
    const extended = await lenderSchemaIsFull(tx);
    if (extended) {
      await insertDefaultLendersExtendedRaw(tx, organizationId, lastReviewedAt);
    } else {
      await insertDefaultLendersLegacyRaw(tx, organizationId, lastReviewedAt);
    }

    if (hasFlagCol) {
      await tx.$executeRaw`
        UPDATE organizations
        SET default_lenders_seeded_at = ${lastReviewedAt}
        WHERE id::text = ${organizationId}
      `;
    }
  });
}

/**
 * For each org, keep at most one row per featured catalog name (Funding Circle, Fleximize, iwoca).
 * Prefer default-seeded rows, then oldest `createdAt`. Safe to run after sync / seed.
 */
export async function dedupeFeaturedCatalogLenders(organizationId: string): Promise<void> {
  const prisma = getPrisma();
  const extended = await lenderSchemaIsFull(prisma);

  if (!extended) {
    const namesSql = DEFAULT_UK_LENDER_DEFINITIONS.map(
      (d) => `'${normLenderName(d.name).replace(/'/g, "''")}'`,
    ).join(", ");
    await prisma.$executeRawUnsafe(
      `WITH ranked AS (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY organization_id::text, lower(trim(name))
                  ORDER BY created_at ASC
                ) AS rn
         FROM lenders
         WHERE organization_id::text = $1
           AND lower(trim(name)) IN (${namesSql})
       )
       DELETE FROM lenders WHERE id IN (SELECT id FROM ranked WHERE rn > 1)`,
      organizationId,
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    const catalogNorm = new Set(
      DEFAULT_UK_LENDER_DEFINITIONS.map((d) => normLenderName(d.name)),
    );
    const rows = await tx.lender.findMany({ where: { organizationId } });
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const n = normLenderName(r.name);
      if (!catalogNorm.has(n)) continue;
      const g = groups.get(n);
      if (g) g.push(r);
      else groups.set(n, [r]);
    }
    for (const list of groups.values()) {
      if (list.length <= 1) continue;
      list.sort((a, b) => {
        if (a.isDefaultSeeded !== b.isDefaultSeeded) return a.isDefaultSeeded ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      const toRemove = list.slice(1).map((x) => x.id);
      await tx.lender.deleteMany({ where: { id: { in: toRemove }, organizationId } });
    }
  });
}

/**
 * Keeps Funding Circle, Fleximize, and iwoca aligned with the catalog.
 * Skips rows the user has genuinely edited (unless still empty: default-seeded with no URL/confidence).
 * Does **not** insert missing rows — that would undo user deletes on the next navigation; use
 * `ensureDefaultLendersForOrganization` / `ensureFeaturedLendersPresent` (e.g. lead-capture) instead.
 */
export async function syncDefaultLendersFromCatalog(organizationId: string): Promise<void> {
  const prisma = getPrisma();
  const extended = await lenderSchemaIsFull(prisma);

  const catalogByNormalizedName = new Map(
    DEFAULT_UK_LENDER_DEFINITIONS.map((d) => [normLenderName(d.name), d] as const),
  );

  if (!extended) {
    await prisma.$transaction(async (tx) => {
      await syncFeaturedLendersLegacySql(organizationId, tx);
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const rows = await tx.lender.findMany({ where: { organizationId } });
    const now = new Date();

    for (const row of rows) {
      const def = catalogByNormalizedName.get(normLenderName(row.name));
      if (!def) continue;
      if (!shouldApplyCatalogSync(row)) continue;

      await tx.lender.update({
        where: { id: row.id },
        data: {
          name: def.name,
          isActive: def.isActive,
          sourceUrl: def.sourceUrl,
          lastReviewedAt: now,
          criteriaConfidence: def.criteriaConfidence,
          minAnnualRevenue: def.minAnnualRevenue,
          minMonthlyRevenue: def.minMonthlyRevenue,
          minTimeTradingMonths: def.minTimeTradingMonths,
          minLoanAmount: def.minLoanAmount,
          maxLoanAmount: def.maxLoanAmount,
          acceptsAdverseCredit: def.acceptsAdverseCredit,
          requiresPersonalGuarantee: def.requiresPersonalGuarantee,
          maxLoanAsRevenueMultiple: def.maxLoanAsRevenueMultiple,
          allowedIndustries:
            def.allowedIndustries == null ? Prisma.DbNull : def.allowedIndustries,
          excludedIndustries:
            def.excludedIndustries == null ? Prisma.DbNull : def.excludedIndustries,
          notes: def.notes,
          isDefaultSeeded: true,
          isUserModified: false,
        },
      });
    }
  });
}
