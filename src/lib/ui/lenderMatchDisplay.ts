/**
 * Presentation helpers for lender match rows (reads persisted explanations / JSON only;
 * does not change matching logic).
 */

/** Score threshold: matches at or above are "good"; between 1 and this are "borderline" (aligns with stricter scoring). */
export const LENDER_MATCH_GOOD_SCORE_MIN = 52;

/** Engine emits scores in 0–100 when eligible; 0 = rejected. */
export const LENDER_MATCH_SCORE_MAX = 100;

export type LenderMatchDisplayTier = "good" | "borderline" | "failed";

export type CriteriaReliabilityLabel = "high" | "medium" | "low";

export type LenderMatchDisplayRow = {
  key: string;
  rank: number;
  lenderName: string;
  score: number | null;
  explanation: string | null;
  tier: LenderMatchDisplayTier;
  passFail: "Pass" | "Fail";
  keyReasons: string[];
  /** Parsed from explanation footer when present. */
  criteriaReliability: CriteriaReliabilityLabel | null;
  /**
   * Org-scoped lender id when `lenderName` matches a row in `lenders` (passed through forms for reliable linking).
   */
  resolvedLenderId?: string | null;
};

export function passFailFromScore(score: number | null): "Pass" | "Fail" {
  if (score == null) return "Fail";
  return score > 0 ? "Pass" : "Fail";
}

export function tierFromScore(score: number | null): LenderMatchDisplayTier {
  if (score == null || score <= 0) return "failed";
  if (score >= LENDER_MATCH_GOOD_SCORE_MIN) return "good";
  return "borderline";
}

export function parseCriteriaReliability(
  explanation: string | null | undefined,
): CriteriaReliabilityLabel | null {
  const m = explanation?.match(/\bCriteria reliability:\s*(high|medium|low)\b/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return null;
}

/** Fit label for decision UI (pairs with percentage). */
export function fitRatingLabel(score: number | null, tier: LenderMatchDisplayTier): string {
  if (tier === "failed" || score == null || score <= 0) return "Not eligible";
  if (tier === "good") {
    if (score >= 85) return "Excellent fit";
    if (score >= 70) return "Strong fit";
    return "Good fit";
  }
  if (score >= 40) return "Moderate fit";
  return "Tentative fit";
}

/** Display score as a 0–100% style string (engine already uses that scale). */
export function formatMatchScorePercent(score: number | null): string {
  if (score == null) return "—";
  return `${Math.round(Math.max(0, Math.min(LENDER_MATCH_SCORE_MAX, score)))}%`;
}

const REASON_COMPACT: [RegExp, string][] = [
  [/^(Requested amount|.*amount) within loan bounds\.?$/i, "Loan size in range"],
  [/^meets annual revenue minimum\.?$/i, "Revenue meets minimum"],
  [/^meets time-trading minimum\.?$/i, "Trading history meets minimum"],
  [/^meets minimum monthly revenue.*$/i, "Monthly revenue rule OK"],
  [/^within revenue-multiple limit\.?$/i, "Within revenue multiple cap"],
  [/^requested amount within loan bounds\.?$/i, "Loan size in range"],
  [/^business type allowed\.?$/i, "Industry allowed"],
  [/^accepts adverse credit profile\.?$/i, "Accepts adverse credit"],
  [/^typically requires personal guarantee.*$/i, "May need personal guarantee"],
  [/^monthly revenue rule not fully validated.*$/i, "Monthly rule not fully checked (data gap)"],
  [
    /^Declared criteria satisfied with limited application detail\.?$/i,
    "Criteria met; limited lead detail",
  ],
  [/^Does not accept adverse credit\.?$/i, "Adverse credit not accepted"],
  [/^Industry .+ is excluded\.?$/i, "Industry excluded"],
  [/^Business type not in this lender.s allowed list\.?$/i, "Industry not on allow-list"],
  [/^Allowed-industry lender requires a business type\.?$/i, "Needs business type"],
  [/^Annual revenue below minimum.*$/i, "Revenue below minimum"],
  [/^Time trading below minimum.*$/i, "Trading time below minimum"],
  [/^Implied monthly revenue below minimum.*$/i, "Monthly revenue below minimum"],
  [/^Requested amount below minimum loan.*$/i, "Amount below min loan"],
  [/^Requested amount above maximum loan.*$/i, "Amount above max loan"],
  [/^Requested amount exceeds .* revenue cap\.?$/i, "Above revenue-multiple cap"],
];

/**
 * Short, scannable bullets for the decision UI.
 */
export function conciseMatchReasons(reasons: string[]): string[] {
  return reasons.map((raw) => {
    let s = raw.trim();
    if (!s) return "";
    if (s.endsWith(".")) s = s.slice(0, -1);
    for (const [re, rep] of REASON_COMPACT) {
      if (re.test(s)) return rep;
    }
    if (s.length > 88) return `${s.slice(0, 85).trim()}…`;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }).filter(Boolean);
}

/**
 * Split engine explanation into bullet reasons (fail: "Not selected: …", pass: "Eligible: …").
 */
export function keyReasonsFromExplanation(explanation: string | null | undefined): string[] {
  if (!explanation?.trim()) return [];
  let t = explanation.trim();
  t = t.replace(/^Not selected:\s*/i, "").replace(/^Eligible:\s*/i, "");
  t = t.replace(/\s*Criteria reliability:\s*(high|medium|low)\.?\s*$/i, "").trim();
  if (t.endsWith(".")) t = t.slice(0, -1);
  return t
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Best lender to lead with: lowest rank among those that passed eligibility
 * (if #1 is rejected, the “top match” is the best remaining score).
 */
export function getGlobalTopMatch(rows: LenderMatchDisplayRow[]): LenderMatchDisplayRow | null {
  const eligible = rows.filter((r) => r.score != null && r.score > 0);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, r) => (r.rank < best.rank ? r : best));
}

export function buildLenderMatchDisplayRows(
  rows: {
    key: string;
    rank: number;
    lenderName: string;
    score: number | null;
    explanation: string | null;
  }[],
): LenderMatchDisplayRow[] {
  return rows.map((r) => {
    const tier = tierFromScore(r.score);
    const keyReasons = keyReasonsFromExplanation(r.explanation);
    return {
      ...r,
      tier,
      passFail: passFailFromScore(r.score),
      keyReasons: conciseMatchReasons(keyReasons),
      criteriaReliability: parseCriteriaReliability(r.explanation),
    };
  });
}

export function groupDisplayRowsByTier(rows: LenderMatchDisplayRow[]): {
  good: LenderMatchDisplayRow[];
  borderline: LenderMatchDisplayRow[];
  failed: LenderMatchDisplayRow[];
} {
  const good: LenderMatchDisplayRow[] = [];
  const borderline: LenderMatchDisplayRow[] = [];
  const failed: LenderMatchDisplayRow[] = [];
  for (const r of rows) {
    if (r.tier === "good") good.push(r);
    else if (r.tier === "borderline") borderline.push(r);
    else failed.push(r);
  }
  return { good, borderline, failed };
}
