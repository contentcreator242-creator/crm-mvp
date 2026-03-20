import { describe, it, expect } from "vitest";
import { rankLendersForLead, type LeadMatchSignals, type LenderCriteria } from "./lenderEngine";

const sampleLender = (over: Partial<LenderCriteria> = {}): LenderCriteria => ({
  name: "Test Lender",
  isActive: true,
  minAnnualRevenue: null,
  minTimeTradingMonths: null,
  minMonthlyRevenue: null,
  minLoanAmount: 10_000,
  maxLoanAmount: 500_000,
  acceptsAdverseCredit: false,
  requiresPersonalGuarantee: false,
  maxLoanAsRevenueMultiple: null,
  allowedIndustries: null,
  excludedIndustries: null,
  criteriaConfidence: "medium",
  ...over,
});

describe("rankLendersForLead", () => {
  it("returns ranked lenders with scores, explanations, and confidence", () => {
    const signals: LeadMatchSignals = {
      firstName: "Alice",
      lastName: "Bee",
      email: "alice@example.com",
      phone: "+15551234567",
      companyName: "Bee Co",
      requestedAmount: 100_000,
      annualRevenue: 500_000,
      timeTradingMonths: 36,
      creditIssues: false,
      businessType: "retail",
      notes: "We need funding for growth.",
    };

    const ranked = rankLendersForLead(signals, [
      sampleLender({ name: "A", criteriaConfidence: "high" }),
      sampleLender({ name: "B", criteriaConfidence: "low" }),
    ]);
    expect(ranked.length).toBe(2);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].explanation.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.lenderName)).toBe(true);
    expect(ranked[0].criteriaConfidence).toBeDefined();
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[0].score - ranked[1].score).toBeGreaterThanOrEqual(8);
  });

  it("spreads passing scores across lenders with different limits (not identical ~75)", () => {
    const signals: LeadMatchSignals = {
      firstName: "Alice",
      lastName: "Bee",
      email: "alice@example.com",
      phone: "+15551234567",
      companyName: "Bee Co",
      requestedAmount: 80_000,
      annualRevenue: 400_000,
      timeTradingMonths: 24,
      creditIssues: false,
      businessType: "retail",
      notes: "Growth capital.",
    };

    const ranked = rankLendersForLead(signals, [
      sampleLender({
        name: "TightMin",
        criteriaConfidence: "high",
        minAnnualRevenue: 380_000,
        minTimeTradingMonths: 22,
        minLoanAmount: 10_000,
        maxLoanAmount: 100_000,
        requiresPersonalGuarantee: true,
      }),
      sampleLender({
        name: "LooseMin",
        criteriaConfidence: "medium",
        minAnnualRevenue: 50_000,
        minTimeTradingMonths: 6,
        minLoanAmount: 5_000,
        maxLoanAmount: 500_000,
        requiresPersonalGuarantee: false,
      }),
    ]);
    expect(ranked[0].score).toBeGreaterThan(0);
    expect(ranked[1].score).toBeGreaterThan(0);
    expect(Math.abs(ranked[0].score - ranked[1].score)).toBeGreaterThanOrEqual(6);
  });

  it("skips inactive lenders", () => {
    const signals: LeadMatchSignals = {
      firstName: "X",
      lastName: "Y",
      email: "x@y.co",
      phone: null,
      companyName: null,
      requestedAmount: 50_000,
      annualRevenue: 300_000,
      timeTradingMonths: 24,
      creditIssues: false,
      businessType: "retail",
      notes: null,
    };

    const ranked = rankLendersForLead(signals, [
      sampleLender({ name: "Off", isActive: false }),
      sampleLender({ name: "On" }),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].lenderName).toBe("On");
  });

  it("disqualifies on excluded industry", () => {
    const signals: LeadMatchSignals = {
      firstName: "X",
      lastName: "Y",
      email: "x@y.co",
      phone: null,
      companyName: null,
      requestedAmount: 50_000,
      annualRevenue: 300_000,
      timeTradingMonths: 24,
      creditIssues: false,
      businessType: "gambling",
      notes: null,
    };

    const ranked = rankLendersForLead(signals, [
      sampleLender({ excludedIndustries: ["gambling"] }),
    ]);
    expect(ranked[0].score).toBe(0);
    expect(ranked[0].explanation.toLowerCase()).toContain("not selected");
  });

  it("applies custom criteria for eligibility", () => {
    const signals: LeadMatchSignals = {
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      phone: null,
      companyName: null,
      requestedAmount: 15_000,
      annualRevenue: 90_000,
      timeTradingMonths: 14,
      creditIssues: true,
      businessType: "retail",
      notes: null,
    };

    const ranked = rankLendersForLead(signals, [
      {
        name: "Only Test",
        isActive: true,
        minAnnualRevenue: 80_000,
        minTimeTradingMonths: 12,
        minMonthlyRevenue: null,
        minLoanAmount: 10_000,
        maxLoanAmount: 200_000,
        acceptsAdverseCredit: true,
        requiresPersonalGuarantee: false,
        maxLoanAsRevenueMultiple: null,
        allowedIndustries: ["retail"],
        excludedIndustries: null,
        criteriaConfidence: "high",
      },
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].lenderName).toBe("Only Test");
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it("disqualifies when requested loan exceeds revenue multiple", () => {
    const signals: LeadMatchSignals = {
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      phone: null,
      companyName: null,
      requestedAmount: 500_000,
      annualRevenue: 100_000,
      timeTradingMonths: 24,
      creditIssues: false,
      businessType: "retail",
      notes: null,
    };

    const ranked = rankLendersForLead(signals, [
      sampleLender({ maxLoanAsRevenueMultiple: 2 }),
    ]);
    expect(ranked[0].score).toBe(0);
  });
});
