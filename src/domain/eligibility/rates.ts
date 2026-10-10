import {
  BASE_RATES,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  MISSING_CREDIT_SCORE_PREMIUM,
  PERCENT_DP,
  RATE_BANDS,
} from './constants';

/**
 * Return the annual interest rate for a given credit score and loan product.
 *
 *   rate = baseRate(loanType) + premium(creditScore)
 *
 * The spec's worked example (650 → 12.5% on a personal loan) is reproduced
 * by the 650–699 band's +2.0 premium over the 10.5% personal-loan base.
 *
 * A missing or non-finite credit score takes the worst valid premium, so an
 * omitted score can never improve an applicant's rate.
 *
 * Pure function. Deterministic, no I/O.
 */
export function interestRateFor(creditScore: number, loanType: string): number {
  return round(baseRateFor(loanType) + premiumFor(creditScore), PERCENT_DP);
}

function baseRateFor(loanType: string): number {
  return BASE_RATES[loanType] ?? BASE_RATES['default'] ?? 10.5;
}

function premiumFor(creditScore: number): number {
  if (!Number.isFinite(creditScore)) {
    return MISSING_CREDIT_SCORE_PREMIUM;
  }

  const clamped = Math.min(Math.max(creditScore, CREDIT_SCORE_MIN), CREDIT_SCORE_MAX);

  for (const band of RATE_BANDS) {
    const withinLower = clamped >= band.min;
    const withinUpper = band.max === null || clamped <= band.max;
    if (withinLower && withinUpper) {
      return band.premium;
    }
  }

  return MISSING_CREDIT_SCORE_PREMIUM;
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}
