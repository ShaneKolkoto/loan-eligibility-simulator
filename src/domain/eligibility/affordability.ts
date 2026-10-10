import type { AffordabilityScore } from '@/services/loans/types/shared';
import { AFFORDABILITY_BANDS, MONEY_DP, PERCENT_DP } from './constants';

export interface AffordabilityInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebt: number;
  requestedAmount: number;
}

export interface AffordabilityOutput {
  disposableIncome: number;
  debtToIncomeRatio: number; // 0–100
  loanToIncomeRatio: number; // 0–100
  affordabilityScore: AffordabilityScore;
}

/**
 * Assess how affordable a loan would be for an applicant.
 *
 * Pure function — no I/O, no globals, deterministic.
 */
export function assessAffordability(input: AffordabilityInput): AffordabilityOutput {
  const { monthlyIncome, monthlyExpenses, existingDebt, requestedAmount } = input;

  const disposableIncome = Math.max(0, monthlyIncome - monthlyExpenses - existingDebt);

  const debtToIncomeRatio =
    monthlyIncome > 0 ? round((existingDebt / monthlyIncome) * 100, PERCENT_DP) : 100;

  const loanToIncomeRatio =
    monthlyIncome > 0 ? round((requestedAmount / monthlyIncome) * 100, PERCENT_DP) : 100;

  return {
    disposableIncome: round(disposableIncome, MONEY_DP),
    debtToIncomeRatio,
    loanToIncomeRatio,
    affordabilityScore: scoreAffordability(debtToIncomeRatio, loanToIncomeRatio, disposableIncome),
  };
}

function scoreAffordability(
  dti: number,
  lti: number,
  disposableIncome: number,
): AffordabilityScore {
  for (const band of AFFORDABILITY_BANDS) {
    if (dti <= band.maxDti && lti <= band.maxLti && disposableIncome >= band.minDisposableIncome) {
      return band.score;
    }
  }
  return 'poor';
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}
