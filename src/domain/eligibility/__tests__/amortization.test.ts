import { describe, it, expect } from 'vitest';
import { amortize } from '../amortization';

describe('amortize', () => {
  it('matches the standard annuity formula for R150,000 at 12.5% over 24 months', () => {
    // The spec's worked example shows R7,089.50, but the formula yields
    // R7,096.10. See README → Decisions.
    const result = amortize({
      principal: 150_000,
      annualRate: 12.5,
      termMonths: 24,
    });

    expect(result.monthlyPayment).toBeCloseTo(7096.1, 1);
    expect(result.schedule).toHaveLength(24);
  });

  it('produces a schedule where the final balance is zero', () => {
    const result = amortize({
      principal: 150_000,
      annualRate: 12.5,
      termMonths: 24,
    });

    const last = result.schedule.at(-1);
    expect(last?.balance).toBeCloseTo(0, 2);
  });

  it('splits each payment into principal + interest that sum to the payment', () => {
    const result = amortize({
      principal: 100_000,
      annualRate: 10,
      termMonths: 12,
    });

    for (const entry of result.schedule) {
      expect(entry.principal + entry.interest).toBeCloseTo(entry.payment, 1);
    }
  });

  it('handles a zero-interest loan without dividing by zero', () => {
    const result = amortize({
      principal: 12_000,
      annualRate: 0,
      termMonths: 12,
    });

    expect(result.monthlyPayment).toBeCloseTo(1000, 2);
    expect(result.totalInterest).toBeCloseTo(0, 2);
  });

  it('the first payment is mostly interest, the last is mostly principal', () => {
    // A 24-month loan has already crossed over in month 1. Use a long-term
    // loan to observe the classic amortization shape.
    const result = amortize({
      principal: 1_500_000,
      annualRate: 12.5,
      termMonths: 240,
    });

    const first = result.schedule[0];
    const last = result.schedule.at(-1);

    expect(first && last).toBeTruthy();
    if (first && last) {
      expect(first.interest).toBeGreaterThan(first.principal);
      expect(last.principal).toBeGreaterThan(last.interest);
    }
  });
});
