/**
 * Domain constants for the eligibility engine.
 *
 * Every threshold and rate used by the domain lives here. If a business
 * rule changes, it changes in exactly one place. The rest of the domain
 * imports from this file and never hard-codes a number.
 */

import type { AffordabilityScore } from '@/services/loans/types/shared';

// ---------------------------------------------------------------------------
// Affordability thresholds
// ---------------------------------------------------------------------------

/** Maximum debt-to-income ratio, as a percentage. */
export const MAX_DTI = 40;

/** Maximum loan-to-income ratio, as a percentage. */
export const MAX_LTI = 60;

/** Minimum disposable income after repayment, in Rand. */
export const MIN_DISPOSABLE_AFTER_REPAYMENT = 1_000;

// ---------------------------------------------------------------------------
// Affordability scoring
// ---------------------------------------------------------------------------

export interface AffordabilityBand {
  score: AffordabilityScore;
  maxDti: number;
  maxLti: number;
  minDisposableIncome: number;
}

export const AFFORDABILITY_BANDS: readonly AffordabilityBand[] = [
  { score: 'excellent', maxDti: 20, maxLti: 40, minDisposableIncome: 10_000 },
  { score: 'good', maxDti: MAX_DTI, maxLti: MAX_LTI, minDisposableIncome: 3_000 },
  {
    score: 'fair',
    maxDti: MAX_DTI + 10,
    maxLti: Number.POSITIVE_INFINITY,
    minDisposableIncome: 1_000,
  },
  {
    score: 'poor',
    maxDti: Number.POSITIVE_INFINITY,
    maxLti: Number.POSITIVE_INFINITY,
    minDisposableIncome: 0,
  },
];

// ---------------------------------------------------------------------------
// Risk classification
// ---------------------------------------------------------------------------

export const RISK_BANDS = [
  { minLikelihood: 75, category: 'low' as const },
  { minLikelihood: 40, category: 'medium' as const },
  { minLikelihood: 0, category: 'high' as const },
] as const;

// ---------------------------------------------------------------------------
// Interest rate card
// ---------------------------------------------------------------------------

export interface RateBand {
  min: number;
  max: number | null;
  premium: number;
}

export const RATE_BANDS: readonly RateBand[] = [
  { min: 750, max: 850, premium: 0.0 },
  { min: 700, max: 749, premium: 1.0 },
  { min: 650, max: 699, premium: 2.0 },
  { min: 600, max: 649, premium: 4.0 },
  { min: 500, max: 599, premium: 6.0 },
  { min: 300, max: 499, premium: 8.0 },
  { min: 0, max: 299, premium: 10.0 },
];

/**
 * Premium applied when no credit score is supplied.
 * Matches the 300–499 band so a missing score is priced identically to the
 * worst valid score. A missing score can never improve an applicant's rate.
 */
export const MISSING_CREDIT_SCORE_PREMIUM = 8.0;

export const BASE_RATES: Readonly<Record<string, number>> = {
  personal_loan: 10.5,
  vehicle_loan: 8.5,
  default: 10.5,
};

export const CREDIT_SCORE_MIN = 300;
export const CREDIT_SCORE_MAX = 850;

// ---------------------------------------------------------------------------
// Approval likelihood
// ---------------------------------------------------------------------------

export const LIKELIHOOD_WEIGHTS = {
  base: 50,
  healthyDisposable: 20,
  lowDti: 15,
  strongCredit: 20,
  missingCredit: 10,
  excessiveLti: 20,
} as const;

export const LIKELIHOOD_MIN = 0;
export const LIKELIHOOD_MAX = 100;

// ---------------------------------------------------------------------------
// Amortization
// ---------------------------------------------------------------------------

export const MONTHS_PER_YEAR = 12;
export const MONEY_DP = 2;
export const PERCENT_DP = 1;
