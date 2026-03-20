/**
 * Default lenders seeded per organization (UK-focused, public marketing sources).
 * Only these three are auto-provisioned: active, fully criteria-filled, editable in-app.
 * Amounts in GBP whole units unless noted. `lastReviewedAt` is set at seed/sync time.
 */

export type DefaultLenderDefinition = {
  name: string;
  isActive: boolean;
  sourceUrl: string | null;
  criteriaConfidence: "high" | "medium" | "low";
  minAnnualRevenue: number | null;
  minMonthlyRevenue: number | null;
  minTimeTradingMonths: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  acceptsAdverseCredit: boolean;
  requiresPersonalGuarantee: boolean;
  maxLoanAsRevenueMultiple: number | null;
  allowedIndustries: string[] | null;
  excludedIndustries: string[] | null;
  notes: string | null;
};

/** Pre-loaded UK lenders: Funding Circle, Fleximize, iwoca — all active; users can edit anytime. */
export const DEFAULT_UK_LENDER_DEFINITIONS: DefaultLenderDefinition[] = [
  {
    name: "Funding Circle",
    isActive: true,
    sourceUrl: "https://www.fundingcircle.com/uk/",
    criteriaConfidence: "high",
    minAnnualRevenue: null,
    minMonthlyRevenue: null,
    minTimeTradingMonths: 12,
    minLoanAmount: 10_000,
    maxLoanAmount: 750_000,
    acceptsAdverseCredit: false,
    requiresPersonalGuarantee: false,
    maxLoanAsRevenueMultiple: null,
    allowedIndustries: null,
    excludedIndustries: null,
    notes:
      "Criteria aligned to publicly stated UK business loan range and typical trading-history expectations (verify on lender site before relying on matching).",
  },
  {
    name: "Fleximize",
    isActive: true,
    sourceUrl: "https://www.fleximize.com/",
    criteriaConfidence: "high",
    minAnnualRevenue: null,
    minMonthlyRevenue: 5_000,
    minTimeTradingMonths: 6,
    minLoanAmount: 5_000,
    maxLoanAmount: 500_000,
    acceptsAdverseCredit: false,
    requiresPersonalGuarantee: false,
    maxLoanAsRevenueMultiple: 2,
    allowedIndustries: null,
    excludedIndustries: null,
    notes:
      "Minimum monthly turnover / trading history and revenue-multiple caps reflect typical published eligibility framing (verify current terms).",
  },
  {
    name: "iwoca",
    isActive: true,
    sourceUrl: "https://www.iwoca.co.uk/",
    criteriaConfidence: "medium",
    minAnnualRevenue: null,
    minMonthlyRevenue: null,
    minTimeTradingMonths: null,
    minLoanAmount: 1_000,
    maxLoanAmount: 1_000_000,
    acceptsAdverseCredit: false,
    requiresPersonalGuarantee: true,
    maxLoanAsRevenueMultiple: null,
    allowedIndustries: null,
    excludedIndustries: null,
    notes:
      "Flexible credit line / loan products; guarantee requirements vary by facility — flag reflects commonly marketed secured/guarantee-backed structures.",
  },
];

/** Canonical names for idempotency when `default_lenders_seeded_at` is not in the DB yet. */
export const DEFAULT_UK_LENDER_SEED_NAMES: readonly string[] =
  DEFAULT_UK_LENDER_DEFINITIONS.map((d) => d.name);
