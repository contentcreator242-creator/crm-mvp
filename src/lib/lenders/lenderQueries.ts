import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

/** DB columns expected for `prisma.lender.*` (see `schema.prisma` @@map lenders). */
const LENDER_TABLE_COLUMNS_FULL = [
  "id",
  "organization_id",
  "name",
  "is_active",
  "source_url",
  "last_reviewed_at",
  "criteria_confidence",
  "min_annual_revenue",
  "min_monthly_revenue",
  "min_time_trading_months",
  "min_loan_amount",
  "max_loan_amount",
  "accepts_adverse_credit",
  "requires_personal_guarantee",
  "max_loan_as_revenue_multiple",
  "allowed_industries",
  "excluded_industries",
  "notes",
  "is_default_seeded",
  "is_user_modified",
  "created_at",
  "updated_at",
] as const;

export type LenderDbClient = {
  $queryRaw: PrismaClient["$queryRaw"];
  lender: PrismaClient["lender"];
};

type LegacyLenderRow = {
  id: string;
  organization_id: string;
  name: string;
  min_annual_revenue: number | null;
  min_time_trading_months: number | null;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
  accepts_adverse_credit: boolean;
  allowed_industries: unknown;
  excluded_industries: unknown;
  created_at: Date;
  updated_at: Date;
};

/** Row shape consumed by Lenders UI + matching (aligned with Prisma `Lender`). */
export type LenderRowShape = {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  sourceUrl: string | null;
  lastReviewedAt: Date | null;
  criteriaConfidence: string | null;
  minAnnualRevenue: number | null;
  minMonthlyRevenue: number | null;
  minTimeTradingMonths: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  acceptsAdverseCredit: boolean;
  requiresPersonalGuarantee: boolean;
  maxLoanAsRevenueMultiple: number | null;
  allowedIndustries: Prisma.JsonValue | null;
  excludedIndustries: Prisma.JsonValue | null;
  notes: string | null;
  isDefaultSeeded: boolean;
  isUserModified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapLegacyLenderRow(r: LegacyLenderRow): LenderRowShape {
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    isActive: true,
    sourceUrl: null,
    lastReviewedAt: r.updated_at,
    criteriaConfidence: null,
    minAnnualRevenue: r.min_annual_revenue,
    minMonthlyRevenue: null,
    minTimeTradingMonths: r.min_time_trading_months,
    minLoanAmount: r.min_loan_amount,
    maxLoanAmount: r.max_loan_amount,
    acceptsAdverseCredit: r.accepts_adverse_credit,
    requiresPersonalGuarantee: false,
    maxLoanAsRevenueMultiple: null,
    allowedIndustries: (r.allowed_industries as Prisma.JsonValue) ?? null,
    excludedIndustries: (r.excluded_industries as Prisma.JsonValue) ?? null,
    notes: null,
    isDefaultSeeded: false,
    isUserModified: false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function lenderSchemaIsFull(
  client: Pick<PrismaClient, "$queryRaw">,
): Promise<boolean> {
  const rows = await client.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lenders'
  `;
  const have = new Set(rows.map((x) => x.column_name.toLowerCase()));
  return LENDER_TABLE_COLUMNS_FULL.every((c) => have.has(c));
}

export async function findLendersForOrganization(
  db: LenderDbClient,
  organizationId: string,
): Promise<LenderRowShape[]> {
  if (await lenderSchemaIsFull(db)) {
    return db.lender.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  const rows = await db.$queryRaw<LegacyLenderRow[]>`
    SELECT
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
    FROM lenders
    WHERE organization_id::text = ${organizationId}
    ORDER BY name ASC
  `;
  return rows.map(mapLegacyLenderRow);
}

export async function findLenderByIdForOrganization(
  db: LenderDbClient,
  organizationId: string,
  lenderId: string,
): Promise<LenderRowShape | null> {
  if (await lenderSchemaIsFull(db)) {
    return db.lender.findFirst({
      where: { id: lenderId, organizationId },
    });
  }

  const rows = await db.$queryRaw<LegacyLenderRow[]>`
    SELECT
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
    FROM lenders
    WHERE id::text = ${lenderId}
      AND organization_id::text = ${organizationId}
    LIMIT 1
  `;
  const r = rows[0];
  return r ? mapLegacyLenderRow(r) : null;
}

/** Active lenders for ranking (same semantics as `findMany` + `isActive: true` when schema is full). */
export async function findActiveLendersForMatching(
  db: LenderDbClient,
  organizationId: string,
): Promise<LenderRowShape[]> {
  if (await lenderSchemaIsFull(db)) {
    return db.lender.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  const all = await findLendersForOrganization(db, organizationId);
  return all.filter((l) => l.isActive);
}

export type LenderUpdateFields = {
  name: string;
  isActive: boolean;
  sourceUrl: string | null;
  lastReviewedAt: Date | null;
  criteriaConfidence: string | null;
  minAnnualRevenue: number | null;
  minMonthlyRevenue: number | null;
  minTimeTradingMonths: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  acceptsAdverseCredit: boolean;
  requiresPersonalGuarantee: boolean;
  maxLoanAsRevenueMultiple: number | null;
  allowedIndustries: Prisma.InputJsonValue | typeof Prisma.DbNull;
  excludedIndustries: Prisma.InputJsonValue | typeof Prisma.DbNull;
  notes: string | null;
  isUserModified: boolean;
};

export type CreateLenderInput = {
  name: string;
  isActive: boolean;
  sourceUrl: string | null;
  criteriaConfidence: string | null;
  minAnnualRevenue: number | null;
  minMonthlyRevenue: number | null;
  minTimeTradingMonths: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  acceptsAdverseCredit: boolean;
  requiresPersonalGuarantee: boolean;
  maxLoanAsRevenueMultiple: number | null;
  allowedIndustries: Prisma.InputJsonValue | typeof Prisma.DbNull;
  excludedIndustries: Prisma.InputJsonValue | typeof Prisma.DbNull;
  notes: string | null;
};

/** Create a user-defined lender for this organization only (`isDefaultSeeded: false`). */
export async function createLenderForOrganization(
  prisma: PrismaClient,
  organizationId: string,
  input: CreateLenderInput,
): Promise<{ id: string }> {
  if (await lenderSchemaIsFull(prisma)) {
    const row = await prisma.lender.create({
      data: {
        organizationId,
        name: input.name,
        isActive: input.isActive,
        sourceUrl: input.sourceUrl,
        lastReviewedAt: null,
        criteriaConfidence: input.criteriaConfidence,
        minAnnualRevenue: input.minAnnualRevenue,
        minMonthlyRevenue: input.minMonthlyRevenue,
        minTimeTradingMonths: input.minTimeTradingMonths,
        minLoanAmount: input.minLoanAmount,
        maxLoanAmount: input.maxLoanAmount,
        acceptsAdverseCredit: input.acceptsAdverseCredit,
        requiresPersonalGuarantee: input.requiresPersonalGuarantee,
        maxLoanAsRevenueMultiple: input.maxLoanAsRevenueMultiple,
        allowedIndustries:
          input.allowedIndustries === Prisma.DbNull ? Prisma.DbNull : input.allowedIndustries,
        excludedIndustries:
          input.excludedIndustries === Prisma.DbNull ? Prisma.DbNull : input.excludedIndustries,
        notes: input.notes,
        isDefaultSeeded: false,
        isUserModified: false,
      },
      select: { id: true },
    });
    return row;
  }

  const id = randomUUID();
  const allowedJson =
    input.allowedIndustries === Prisma.DbNull ? null : JSON.stringify(input.allowedIndustries);
  const excludedJson =
    input.excludedIndustries === Prisma.DbNull ? null : JSON.stringify(input.excludedIndustries);

  await prisma.$executeRawUnsafe(
    `INSERT INTO lenders (
        id, organization_id, name,
        min_annual_revenue, min_time_trading_months, min_loan_amount, max_loan_amount,
        accepts_adverse_credit, allowed_industries, excluded_industries,
        created_at, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3,
        $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, NOW(), NOW()
      )`,
    id,
    organizationId,
    input.name,
    input.minAnnualRevenue,
    input.minTimeTradingMonths,
    input.minLoanAmount,
    input.maxLoanAmount,
    input.acceptsAdverseCredit,
    allowedJson,
    excludedJson,
  );
  return { id };
}

/** Delete a lender only if it belongs to the org and is not default-seeded. Returns true if a row was removed. */
export async function deleteCustomLenderForOrganization(
  prisma: PrismaClient,
  organizationId: string,
  lenderId: string,
): Promise<boolean> {
  if (await lenderSchemaIsFull(prisma)) {
    const r = await prisma.lender.deleteMany({
      where: {
        id: lenderId,
        organizationId,
        isDefaultSeeded: false,
      },
    });
    return r.count > 0;
  }

  /** Legacy MVP table (no extended columns): remove row scoped to org. */
  const n = await prisma.$executeRaw`
    DELETE FROM lenders
    WHERE id::text = ${lenderId}
      AND organization_id::text = ${organizationId}
  `;
  return Number(n) > 0;
}

/** Persist changes when the DB only has the original MVP lender columns. */
export async function updateLenderLegacyMvpColumns(
  db: Pick<PrismaClient, "$executeRawUnsafe">,
  organizationId: string,
  lenderId: string,
  v: Pick<
    LenderUpdateFields,
    | "name"
    | "minAnnualRevenue"
    | "minTimeTradingMonths"
    | "minLoanAmount"
    | "maxLoanAmount"
    | "acceptsAdverseCredit"
    | "allowedIndustries"
    | "excludedIndustries"
  >,
): Promise<void> {
  const allowedJson =
    v.allowedIndustries === Prisma.DbNull ? null : JSON.stringify(v.allowedIndustries);
  const excludedJson =
    v.excludedIndustries === Prisma.DbNull ? null : JSON.stringify(v.excludedIndustries);

  await db.$executeRawUnsafe(
    `UPDATE lenders SET
      name = $1,
      min_annual_revenue = $2,
      min_time_trading_months = $3,
      min_loan_amount = $4,
      max_loan_amount = $5,
      accepts_adverse_credit = $6,
      allowed_industries = $7::jsonb,
      excluded_industries = $8::jsonb,
      updated_at = NOW()
    WHERE id::text = $9 AND organization_id::text = $10`,
    v.name,
    v.minAnnualRevenue,
    v.minTimeTradingMonths,
    v.minLoanAmount,
    v.maxLoanAmount,
    v.acceptsAdverseCredit,
    allowedJson,
    excludedJson,
    lenderId,
    organizationId,
  );
}
