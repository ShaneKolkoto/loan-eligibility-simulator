import { describe, it, expect } from 'vitest';
import { assessAffordability } from '../affordability';

describe('assessAffordability', () => {
  it('computes disposable income as income − expenses − existing debt', () => {
    const result = assessAffordability({
      monthlyIncome: 25_000,
      monthlyExpenses: 15_000,
      existingDebt: 5_000,
      requestedAmount: 150_000,
    });

    expect(result.disposableIncome).toBe(5_000);
  });

  it('computes DTI as existing debt / income × 100', () => {
    const result = assessAffordability({
      monthlyIncome: 25_000,
      monthlyExpenses: 15_000,
      existingDebt: 5_000,
      requestedAmount: 150_000,
    });

    expect(result.debtToIncomeRatio).toBeCloseTo(20, 1);
  });

  it('computes LTI as requested amount / income × 100', () => {
    const result = assessAffordability({
      monthlyIncome: 25_000,
      monthlyExpenses: 15_000,
      existingDebt: 5_000,
      requestedAmount: 150_000,
    });

    expect(result.loanToIncomeRatio).toBeCloseTo(600, 1);
  });

  it('returns "excellent" for a low-DTI, high-surplus applicant', () => {
    const result = assessAffordability({
      monthlyIncome: 50_000,
      monthlyExpenses: 10_000,
      existingDebt: 0,
      requestedAmount: 15_000,
    });

    expect(result.affordabilityScore).toBe('excellent');
  });

  it('returns "poor" for a heavily-indebted applicant', () => {
    const result = assessAffordability({
      monthlyIncome: 10_000,
      monthlyExpenses: 9_000,
      existingDebt: 4_000,
      requestedAmount: 300_000,
    });

    expect(result.affordabilityScore).toBe('poor');
  });

  it('never returns a negative disposable income', () => {
    const result = assessAffordability({
      monthlyIncome: 5_000,
      monthlyExpenses: 8_000,
      existingDebt: 2_000,
      requestedAmount: 10_000,
    });

    expect(result.disposableIncome).toBeGreaterThanOrEqual(0);
  });
});
