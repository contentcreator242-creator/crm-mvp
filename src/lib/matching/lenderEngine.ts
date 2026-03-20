/**
 * Lender ranking: hard eligibility gates, then weighted signal completeness,
 * scaled by criteria confidence (high / medium / low).
 */

export type LeadMatchSignals = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  requestedAmount: number | null;
  annualRevenue: number | null;
  timeTradingMonths: number | null;
  creditIssues: boolean | null;
  businessType: string | null;
  notes: string | null;
};

export type LenderCriteria = {
  name: string;
  isActive: boolean;
  minAnnualRevenue: number | null;
  minTimeTradingMonths: number | null;
  minMonthlyRevenue: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  acceptsAdverseCredit: boolean;
  requiresPersonalGuarantee: boolean;
  maxLoanAsRevenueMultiple: number | null;
  /** Lowercased industry tokens; null/empty = no allow-list (still respect excluded). */
  allowedIndustries: string[] | null;
  /** Lowercased industry tokens; match → disqualify. */
  excludedIndustries: string[] | null;
  criteriaConfidence: string | null;
};

export type RankedLender = {
  lenderName: string;
  score: number;
  rank: number;
  explanation: string;
  criteriaConfidence: string | null;
};

function normIndustry(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function jsonToIndustryList(j: unknown): string[] | null {
  if (j == null) return null;
  if (!Array.isArray(j)) return null;
  const list = j
    .filter((x): x is string => typeof x === "string")
    .map((x) => normIndustry(x))
    .filter(Boolean);
  return list.length ? list : null;
}

/** Map a Prisma `Lender` row into engine criteria (amounts = whole currency units). */
export function prismaLenderToCriteria(row: {
  name: string;
  isActive: boolean;
  minAnnualRevenue: number | null;
  minTimeTradingMonths: number | null;
  minMonthlyRevenue: number | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  acceptsAdverseCredit: boolean;
  requiresPersonalGuarantee: boolean;
  maxLoanAsRevenueMultiple: number | null;
  allowedIndustries: unknown;
  excludedIndustries: unknown;
  criteriaConfidence: string | null;
}): LenderCriteria {
  return {
    name: row.name,
    isActive: row.isActive,
    minAnnualRevenue: row.minAnnualRevenue,
    minTimeTradingMonths: row.minTimeTradingMonths,
    minMonthlyRevenue: row.minMonthlyRevenue,
    minLoanAmount: row.minLoanAmount,
    maxLoanAmount: row.maxLoanAmount,
    acceptsAdverseCredit: row.acceptsAdverseCredit,
    requiresPersonalGuarantee: row.requiresPersonalGuarantee,
    maxLoanAsRevenueMultiple: row.maxLoanAsRevenueMultiple,
    allowedIndustries: jsonToIndustryList(row.allowedIndustries),
    excludedIndustries: jsonToIndustryList(row.excludedIndustries),
    criteriaConfidence: row.criteriaConfidence,
  };
}

/** Stronger spread: low-confidence criteria should score materially lower. */
function confidenceMultiplier(conf: string | null): number {
  const c = (conf ?? "medium").toLowerCase();
  if (c === "high") return 1;
  if (c === "low") return 0.54;
  return 0.72;
}

/** Weighted completeness (sum of weights = 44). */
function weightedDataQuality(signals: LeadMatchSignals): number {
  let acc = 0;
  if (signals.email) acc += 5;
  if (signals.phone) acc += 5;
  if (signals.companyName) acc += 4;
  if (signals.requestedAmount != null) acc += 6;
  if (signals.annualRevenue != null) acc += 6;
  if (signals.timeTradingMonths != null) acc += 6;
  if (signals.businessType) acc += 4;
  const noteText = (signals.notes ?? "").trim();
  if (noteText.length > 0) acc += Math.min(8, 2 + Math.floor(noteText.length / 120));
  return acc / 44;
}

/**
 * Per-lender adjustment so passing scores diverge for the same lead (shared `q` alone
 * used to make almost every lender land ~70–80).
 */
function lenderFitAdjustment(signals: LeadMatchSignals, lender: LenderCriteria): number {
  let adj = 0;

  if (lender.minAnnualRevenue != null) {
    if (signals.annualRevenue != null) {
      const min = lender.minAnnualRevenue;
      const margin = (signals.annualRevenue - min) / Math.max(1, min);
      adj += Math.min(16, 2 + margin * 10);
    } else {
      adj -= 12;
    }
  }

  if (lender.minTimeTradingMonths != null) {
    if (signals.timeTradingMonths != null) {
      const min = lender.minTimeTradingMonths;
      const margin = (signals.timeTradingMonths - min) / Math.max(1, min);
      adj += Math.min(14, 2 + margin * 9);
    } else {
      adj -= 9;
    }
  }

  if (lender.minMonthlyRevenue != null && signals.annualRevenue == null) {
    adj -= 10;
  }

  if (
    lender.minLoanAmount != null &&
    lender.maxLoanAmount != null &&
    signals.requestedAmount != null
  ) {
    const lo = lender.minLoanAmount;
    const hi = lender.maxLoanAmount;
    const span = hi - lo;
    if (span > 0) {
      const headroomFromMax = (hi - signals.requestedAmount) / span;
      adj += 3 + Math.max(0, Math.min(14, headroomFromMax * 14));
    }
  } else if (
    (lender.minLoanAmount != null || lender.maxLoanAmount != null) &&
    signals.requestedAmount == null
  ) {
    adj -= 8;
  }

  if (
    lender.maxLoanAsRevenueMultiple != null &&
    signals.annualRevenue != null &&
    signals.annualRevenue > 0 &&
    signals.requestedAmount != null
  ) {
    const cap = signals.annualRevenue * lender.maxLoanAsRevenueMultiple;
    if (signals.requestedAmount <= cap && cap > 0) {
      adj += Math.min(12, ((cap - signals.requestedAmount) / cap) * 15);
    }
  }

  if (lender.requiresPersonalGuarantee) {
    adj -= 12;
  }

  const rulesSet = [
    lender.minAnnualRevenue,
    lender.minTimeTradingMonths,
    lender.minMonthlyRevenue,
    lender.minLoanAmount,
    lender.maxLoanAmount,
    lender.maxLoanAsRevenueMultiple,
  ].filter((x) => x != null).length;
  adj += Math.min(6, rulesSet * 1);

  return adj;
}

function scoreOne(
  signals: LeadMatchSignals,
  lender: LenderCriteria,
): {
  score: number;
  explanation: string;
  criteriaConfidence: string | null;
} {
  const industry = normIndustry(signals.businessType);
  const failReasons: string[] = [];
  const passNotes: string[] = [];
  const conf = lender.criteriaConfidence;

  const excluded = lender.excludedIndustries ?? [];
  if (industry && excluded.includes(industry)) {
    failReasons.push(`Industry “${signals.businessType}” is excluded`);
  }

  const allowed = lender.allowedIndustries;
  if (allowed && allowed.length > 0) {
    if (!industry) {
      failReasons.push("Allowed-industry lender requires a business type");
    } else if (!allowed.includes(industry)) {
      failReasons.push(`Business type not in this lender’s allowed list`);
    } else {
      passNotes.push("business type allowed");
    }
  }

  if (signals.creditIssues === true && !lender.acceptsAdverseCredit) {
    failReasons.push("Does not accept adverse credit");
  } else if (signals.creditIssues === true && lender.acceptsAdverseCredit) {
    passNotes.push("accepts adverse credit profile");
  }

  if (
    lender.minAnnualRevenue != null &&
    signals.annualRevenue != null &&
    signals.annualRevenue < lender.minAnnualRevenue
  ) {
    failReasons.push(
      `Annual revenue below minimum (${lender.minAnnualRevenue.toLocaleString("en-GB")})`,
    );
  } else if (lender.minAnnualRevenue != null && signals.annualRevenue != null) {
    passNotes.push("meets annual revenue minimum");
  }

  if (
    lender.minTimeTradingMonths != null &&
    signals.timeTradingMonths != null &&
    signals.timeTradingMonths < lender.minTimeTradingMonths
  ) {
    failReasons.push(
      `Time trading below minimum (${lender.minTimeTradingMonths} months)`,
    );
  } else if (lender.minTimeTradingMonths != null && signals.timeTradingMonths != null) {
    passNotes.push("meets time-trading minimum");
  }

  if (lender.minMonthlyRevenue != null && signals.annualRevenue != null) {
    const monthly = signals.annualRevenue / 12;
    if (monthly < lender.minMonthlyRevenue) {
      failReasons.push(
        `Implied monthly revenue below minimum (${lender.minMonthlyRevenue.toLocaleString("en-GB")}/mo)`,
      );
    } else {
      passNotes.push("meets minimum monthly revenue (from annual figures)");
    }
  } else if (lender.minMonthlyRevenue != null && signals.annualRevenue == null) {
    passNotes.push("monthly revenue rule not fully validated (annual revenue missing)");
  }

  if (signals.requestedAmount != null) {
    if (lender.minLoanAmount != null && signals.requestedAmount < lender.minLoanAmount) {
      failReasons.push(
        `Requested amount below minimum loan (${lender.minLoanAmount.toLocaleString("en-GB")})`,
      );
    } else if (lender.maxLoanAmount != null && signals.requestedAmount > lender.maxLoanAmount) {
      failReasons.push(
        `Requested amount above maximum loan (${lender.maxLoanAmount.toLocaleString("en-GB")})`,
      );
    } else {
      passNotes.push("requested amount within loan bounds");
    }
  }

  if (
    lender.maxLoanAsRevenueMultiple != null &&
    signals.annualRevenue != null &&
    signals.annualRevenue > 0 &&
    signals.requestedAmount != null
  ) {
    const cap = signals.annualRevenue * lender.maxLoanAsRevenueMultiple;
    if (signals.requestedAmount > cap) {
      failReasons.push(
        `Requested amount exceeds ${lender.maxLoanAsRevenueMultiple}× annual revenue cap`,
      );
    } else {
      passNotes.push("within revenue-multiple limit");
    }
  }

  if (failReasons.length > 0) {
    return {
      score: 0,
      explanation: `Not selected: ${failReasons.join("; ")}.`,
      criteriaConfidence: conf,
    };
  }

  const q = weightedDataQuality(signals);
  const mult = confidenceMultiplier(lender.criteriaConfidence);
  const baseCore = 14 + 36 * q;
  const fit = lenderFitAdjustment(signals, lender);
  const combined = (baseCore + fit) * mult;
  const score = Math.max(1, Math.min(100, Math.round(combined)));

  if (lender.requiresPersonalGuarantee) {
    passNotes.push("typically requires personal guarantee (confirm with lender)");
  }

  const confLabel = conf ? ` Criteria reliability: ${conf}.` : "";
  return {
    score,
    explanation:
      (passNotes.length > 0
        ? `Eligible: ${passNotes.join("; ")}.`
        : "Eligible: declared criteria satisfied with limited application detail.") + confLabel,
    criteriaConfidence: conf,
  };
}

export function rankLendersForLead(
  signals: LeadMatchSignals,
  lenders: LenderCriteria[],
): RankedLender[] {
  const active = lenders.filter((l) => l.isActive);

  const rows = active.map((lender) => {
    const { score, explanation, criteriaConfidence } = scoreOne(signals, lender);
    return { lenderName: lender.name, score, explanation, criteriaConfidence };
  });

  rows.sort(
    (a, b) => b.score - a.score || a.lenderName.localeCompare(b.lenderName),
  );

  return rows.map((r, idx) => ({
    lenderName: r.lenderName,
    score: r.score,
    rank: idx + 1,
    explanation: r.explanation,
    criteriaConfidence: r.criteriaConfidence,
  }));
}

/** @deprecated use rankLendersForLead + LeadMatchSignals */
export type LeadSignals = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
};

export function leadSubmissionToSignals(row: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  companyName?: string | null;
  requestedAmount?: number | null;
  annualRevenue?: number | null;
  timeTradingMonths?: number | null;
  creditIssues?: boolean | null;
  businessType?: string | null;
  notes?: string | null;
}): LeadMatchSignals {
  const firstFromFull = row.fullName?.trim().split(/\s+/)[0] ?? null;
  const firstName = row.firstName?.trim() || firstFromFull || null;
  const lastFromFull = (() => {
    const parts = row.fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
    return parts.length > 1 ? parts.slice(1).join(" ") : null;
  })();
  const lastName = row.lastName?.trim() || lastFromFull || null;

  return {
    firstName,
    lastName,
    email: row.email ?? null,
    phone: row.phone ?? null,
    companyName: row.companyName ?? null,
    requestedAmount: row.requestedAmount ?? null,
    annualRevenue: row.annualRevenue ?? null,
    timeTradingMonths: row.timeTradingMonths ?? null,
    creditIssues: row.creditIssues ?? null,
    businessType: row.businessType ?? null,
    notes: row.notes ?? row.message ?? null,
  };
}
