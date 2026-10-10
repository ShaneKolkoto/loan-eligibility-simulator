import { describe, it, expect } from 'vitest';
import { interestRateFor } from '../rates';

describe('interestRateFor', () => {
  it('returns the spec rate for a 650 score on a personal loan', () => {
    expect(interestRateFor(650, 'personal_loan')).toBeCloseTo(12.5, 1);
  });

  it('charges a lower rate for a higher credit score', () => {
    const high = interestRateFor(800, 'personal_loan');
    const mid = interestRateFor(650, 'personal_loan');
    const low = interestRateFor(500, 'personal_loan');

    expect(high).toBeLessThan(mid);
    expect(mid).toBeLessThan(low);
  });

  it('charges a lower rate for a vehicle loan than a personal loan at the same score', () => {
    const personal = interestRateFor(650, 'personal_loan');
    const vehicle = interestRateFor(650, 'vehicle_loan');

    expect(vehicle).toBeLessThan(personal);
  });

  it('prices a missing credit score no better than the worst valid score', () => {
    const best = interestRateFor(850, 'personal_loan');
    const missing = interestRateFor(Number.NaN, 'personal_loan');

    expect(missing).toBeGreaterThan(best);
  });

  it('clamps scores outside the valid 300–850 range', () => {
    expect(interestRateFor(200, 'personal_loan')).toBeCloseTo(
      interestRateFor(300, 'personal_loan'),
      1,
    );
    expect(interestRateFor(900, 'personal_loan')).toBeCloseTo(
      interestRateFor(850, 'personal_loan'),
      1,
    );
  });
});
