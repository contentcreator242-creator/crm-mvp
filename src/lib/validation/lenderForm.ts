import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { lenderSchemaIsFull } from "@/lib/lenders/lenderQueries";

export function zodIssuesSummary(err: { issues: ReadonlyArray<{ message: string }> }): string {
  return [...new Set(err.issues.map((i) => i.message))].join(" · ");
}

/** Raw form fields before coercion (strings from FormData). */
export const lenderFormRawSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(180)),
  isActive: z.enum(["true", "false"]),
  sourceUrl: z.string().max(2000).optional().nullable(),
  lastReviewedAt: z.string().optional().nullable(),
  criteriaConfidence: z.string().optional().nullable(),
  minAnnualRevenue: z.string().optional().nullable(),
  minMonthlyRevenue: z.string().optional().nullable(),
  minTimeTradingMonths: z.string().optional().nullable(),
  minLoanAmount: z.string().optional().nullable(),
  maxLoanAmount: z.string().optional().nullable(),
  acceptsAdverseCredit: z.enum(["true", "false"]),
  requiresPersonalGuarantee: z.enum(["true", "false"]),
  maxLoanAsRevenueMultiple: z.string().optional().nullable(),
  allowedIndustriesCsv: z.string().optional().nullable(),
  excludedIndustriesCsv: z.string().optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
  /** Allow saving when another lender in the org has the same name (case-insensitive). */
  allowDuplicateName: z.enum(["true", "false"]).optional(),
});

export type LenderFormRaw = z.infer<typeof lenderFormRawSchema>;

export type CoercedLenderForm = {
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
  allowDuplicateName: boolean;
};

/**
 * Parse CSV into sorted unique lowercase tokens for stable JSON storage.
 */
export function normalizeIndustriesFromCsv(
  raw: string | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const parts = (raw ?? "")
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(parts)].sort((a, b) => a.localeCompare(b));
  if (unique.length === 0) return Prisma.DbNull;
  return unique;
}

function intOrNull(s: string | null | undefined): { ok: true; v: number | null } | { ok: false; msg: string } {
  const t = (s ?? "").trim();
  if (!t) return { ok: true, v: null };
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, msg: "Use whole numbers for amounts and months" };
  }
  if (n < 0) return { ok: false, msg: "Values must be zero or positive" };
  return { ok: true, v: n };
}

function floatOrNull(s: string | null | undefined): { ok: true; v: number | null } | { ok: false; msg: string } {
  const t = (s ?? "").trim();
  if (!t) return { ok: true, v: null };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, msg: "Invalid number" };
  if (n < 0) return { ok: false, msg: "Values must be zero or positive" };
  return { ok: true, v: n };
}

/**
 * Validate numeric rules, loan bounds, industry overlap; return coerced payload or issues.
 */
export function validateAndCoerceLenderForm(
  data: LenderFormRaw,
): { ok: true; value: CoercedLenderForm } | { ok: false; issues: string[] } {
  const issues: string[] = [];

  const minAR = intOrNull(data.minAnnualRevenue);
  if (!minAR.ok) issues.push(minAR.msg);
  const minMR = intOrNull(data.minMonthlyRevenue);
  if (!minMR.ok) issues.push(minMR.msg);
  const minTT = intOrNull(data.minTimeTradingMonths);
  if (!minTT.ok) issues.push(minTT.msg);
  const minLoan = intOrNull(data.minLoanAmount);
  if (!minLoan.ok) issues.push(minLoan.msg);
  const maxLoan = intOrNull(data.maxLoanAmount);
  if (!maxLoan.ok) issues.push(maxLoan.msg);
  const mult = floatOrNull(data.maxLoanAsRevenueMultiple);
  if (!mult.ok) issues.push(mult.msg);

  if (
    minLoan.ok &&
    maxLoan.ok &&
    minLoan.v != null &&
    maxLoan.v != null &&
    minLoan.v > maxLoan.v
  ) {
    issues.push("Minimum loan must be less than or equal to maximum loan");
  }

  const allowedIndustries = normalizeIndustriesFromCsv(data.allowedIndustriesCsv);
  const excludedIndustries = normalizeIndustriesFromCsv(data.excludedIndustriesCsv);

  if (Array.isArray(allowedIndustries) && Array.isArray(excludedIndustries)) {
    const a = new Set(allowedIndustries);
    const overlap = excludedIndustries.filter((t) => a.has(t));
    if (overlap.length > 0) {
      issues.push(
        `Industry cannot be both allowed and excluded: ${overlap.join(", ")}`,
      );
    }
  }

  if (issues.length > 0) return { ok: false, issues: [...new Set(issues)] };

  const rc = data.criteriaConfidence?.trim().toLowerCase();
  const conf =
    rc === "high" || rc === "medium" || rc === "low" ? rc : null;

  return {
    ok: true,
    value: {
      name: data.name,
      isActive: data.isActive === "true",
      sourceUrl: data.sourceUrl?.trim() || null,
      criteriaConfidence: conf,
      minAnnualRevenue: minAR.ok ? minAR.v : null,
      minMonthlyRevenue: minMR.ok ? minMR.v : null,
      minTimeTradingMonths: minTT.ok ? minTT.v : null,
      minLoanAmount: minLoan.ok ? minLoan.v : null,
      maxLoanAmount: maxLoan.ok ? maxLoan.v : null,
      acceptsAdverseCredit: data.acceptsAdverseCredit === "true",
      requiresPersonalGuarantee: data.requiresPersonalGuarantee === "true",
      maxLoanAsRevenueMultiple: mult.ok ? mult.v : null,
      allowedIndustries,
      excludedIndustries,
      notes: data.notes?.trim() || null,
      allowDuplicateName: data.allowDuplicateName === "true",
    },
  };
}

/** True if another lender in the org already has this name (case-insensitive). */
export async function hasDuplicateLenderName(
  prisma: PrismaClient,
  organizationId: string,
  name: string,
  excludeLenderId?: string,
): Promise<boolean> {
  const target = name.trim().toLowerCase();
  if (!target) return false;

  if (await lenderSchemaIsFull(prisma)) {
    const rows = await prisma.lender.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    return rows.some(
      (r) => r.id !== excludeLenderId && r.name.trim().toLowerCase() === target,
    );
  }

  const rows = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id::text AS id, name FROM lenders WHERE organization_id::text = ${organizationId}
  `;
  return rows.some(
    (r) => r.id !== excludeLenderId && r.name.trim().toLowerCase() === target,
  );
}
