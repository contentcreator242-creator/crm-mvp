/** Included in base £39/mo subscription — not billed as extra seats. */
export const INCLUDED_SEATS = 3;

/** Display / estimate only — actual charge is Stripe Prices. */
export const BASE_PLAN_GBP_PER_MONTH = 39;
export const EXTRA_SEAT_GBP_PER_MONTH = 10;

export function extraSeatsFromActiveCount(activeMemberCount: number): number {
  return Math.max(0, activeMemberCount - INCLUDED_SEATS);
}

export function estimatedMonthlyTotalGbp(activeMemberCount: number): number {
  return BASE_PLAN_GBP_PER_MONTH + extraSeatsFromActiveCount(activeMemberCount) * EXTRA_SEAT_GBP_PER_MONTH;
}
