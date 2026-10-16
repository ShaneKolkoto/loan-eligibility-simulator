import type { EligibilityRequest, EligibilityResponse } from '@/services/loans/types/eligibility';
import type { ValidationRulesResponse } from '@/services/loans/types/validation';
import type { RiskCategory } from '@/services/loans/types/shared';

import { assessAffordability } from './affordability';
import { amortize } from './amortization';
import { interestRateFor } from './rates';
import {
  LIKELIHOOD_MAX,
  LIKELIHOOD_MIN,
  LIKELIHOOD_WEIGHTS,
  MAX_DTI,
  MAX_LTI,
  MIN_CREDIT_SCORE,
  MIN_DISPOSABLE_AFTER_REPAYMENT,
  MONEY_DP,
  RISK_BANDS,
} from './constants';

/**
 * Currency formatter for decision-reason strings. Kept module-level so it's
 * constructed once rather than per evaluation.
 */
const CURRENCY_DISPLAY = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 2,
});

/**
 * Evaluate a loan application end-to-end.
 *
 * Orchestrates: rule checks → affordability → gates → pricing → likelihood
 * → risk. The MSW handler calls exactly this function, so the mocked backend
 * and the real domain logic can never drift.
 *
 * Pure. No I/O, no globals, no randomness.
 */
export function evaluateEligibility(
  request: EligibilityRequest,
  rules: ValidationRulesResponse,
): EligibilityResponse {
  const { financialInfo, loanDetails } = request;

  const failures = collectRuleFailures(request, rules);

  const affordability = assessAffordability({
    monthlyIncome: financialInfo.monthlyIncome,
    monthlyExpenses: financialInfo.monthlyExpenses,
    existingDebt: financialInfo.existingDebt,
    requestedAmount: loanDetails.requestedAmount,
  });

  // Gate 1 — DTI. Is the applicant already over-committed relative to
  // their income? This is the standard first test in retail lending.
  if (affordability.debtToIncomeRatio > MAX_DTI) {
    failures.push(
      `Debt-to-income ratio of ${affordability.debtToIncomeRatio.toFixed(1)}% exceeds the maximum of ${MAX_DTI}%`,
    );
  }

  // Gate 2 — credit score. A very low score is a decline, not merely
  // expensive pricing. A missing score (NaN) is not a decline; it's priced
  // at the worst band and flagged in the decision reason. That's a
  // different situation from a verified low score.
  if (Number.isFinite(financialInfo.creditScore) && financialInfo.creditScore < MIN_CREDIT_SCORE) {
    failures.push(
      `Credit score of ${financialInfo.creditScore} is below the minimum of ${MIN_CREDIT_SCORE}`,
    );
  }

  const interestRate = interestRateFor(financialInfo.creditScore, 'personal_loan');
  const amort = amortize({
    principal: loanDetails.requestedAmount,
    annualRate: interestRate,
    termMonths: loanDetails.loanTerm,
  });

  // Disposable income after the new monthly repayment. If this is negative
  // the applicant cannot service the loan at all.
  const disposableAfterRepayment = round(
    affordability.disposableIncome - amort.monthlyPayment,
    MONEY_DP,
  );

  // Gate 3 — serviceability. Can the applicant afford the instalment on top
  // of their existing commitments? This is the correct test for a term loan.
  // LTI is deliberately not a gate here: a loan can be large relative to
  // income yet still comfortably serviceable over a fixed term.
  if (disposableAfterRepayment < MIN_DISPOSABLE_AFTER_REPAYMENT) {
    failures.push(
      `Disposable income after repayment of ${CURRENCY_DISPLAY.format(disposableAfterRepayment)} is below the minimum of ${CURRENCY_DISPLAY.format(MIN_DISPOSABLE_AFTER_REPAYMENT)}`,
    );
  }

  const isEligible = failures.length === 0;

  const approvalLikelihood = computeApprovalLikelihood({
    isEligible,
    dti: affordability.debtToIncomeRatio,
    lti: affordability.loanToIncomeRatio,
    creditScore: financialInfo.creditScore,
    disposableAfterRepayment,
  });
  const riskCategory = riskCategoryFor(approvalLikelihood);

  // With serviceability as the gate, the maximum we'd offer is what they
  // asked for. There is no separate LTI ceiling to compute against.
  const maxAmount = round(loanDetails.requestedAmount, MONEY_DP);

  return {
    eligibilityResult: {
      isEligible,
      approvalLikelihood,
      riskCategory,
      decisionReason: buildDecisionReason(failures, financialInfo.creditScore),
    },
    recommendedLoan: {
      maxAmount,
      recommendedAmount: round(Math.min(loanDetails.requestedAmount, maxAmount), MONEY_DP),
      interestRate,
      monthlyPayment: amort.monthlyPayment,
      totalRepayment: amort.totalRepayment,
    },
    affordabilityAnalysis: {
      disposableIncome: affordability.disposableIncome,
      debtToIncomeRatio: affordability.debtToIncomeRatio,
      loanToIncomeRatio: affordability.loanToIncomeRatio,
      affordabilityScore: affordability.affordabilityScore,
    },
  };
}

function collectRuleFailures(
  request: EligibilityRequest,
  rules: ValidationRulesResponse,
): string[] {
  const failures: string[] = [];
  const { personalInfo, financialInfo, loanDetails } = request;

  if (personalInfo.age < rules.personalInfo.age.min) {
    failures.push(rules.personalInfo.age.errorMessage);
  } else if (
    rules.personalInfo.age.max !== undefined &&
    personalInfo.age > rules.personalInfo.age.max
  ) {
    failures.push(rules.personalInfo.age.errorMessage);
  }

  // Employment rules are per status. The API's validation rules define a
  // single minimum duration without regard to status; applied literally,
  // that rejects a retiree who retired last month and accepts a long-term
  // unemployed applicant.
  //
  // - Employed / self-employed: minimum months in current employment.
  // - Retired: no duration requirement. Pension and investment income
  //   count as qualifying income; the retirement duration tells us nothing
  //   about creditworthiness.
  // - Unemployed: rejected. There is no income to service a loan.
  const isWorking =
    personalInfo.employmentStatus === 'employed' ||
    personalInfo.employmentStatus === 'self_employed';

  if (personalInfo.employmentStatus === 'unemployed') {
    failures.push('Unemployed applicants are not eligible — there is no income to service a loan.');
  } else if (
    isWorking &&
    personalInfo.employmentDuration < rules.personalInfo.employmentDuration.min
  ) {
    failures.push(rules.personalInfo.employmentDuration.errorMessage);
  }

  if (financialInfo.monthlyIncome < rules.financialInfo.monthlyIncome.min) {
    failures.push(rules.financialInfo.monthlyIncome.errorMessage);
  }

  if (loanDetails.requestedAmount < rules.loanDetails.requestedAmount.min) {
    failures.push(rules.loanDetails.requestedAmount.errorMessage);
  } else if (
    rules.loanDetails.requestedAmount.max !== undefined &&
    loanDetails.requestedAmount > rules.loanDetails.requestedAmount.max
  ) {
    failures.push(rules.loanDetails.requestedAmount.errorMessage);
  }

  if (loanDetails.loanTerm < rules.loanDetails.loanTerm.min) {
    failures.push(rules.loanDetails.loanTerm.errorMessage);
  } else if (
    rules.loanDetails.loanTerm.max !== undefined &&
    loanDetails.loanTerm > rules.loanDetails.loanTerm.max
  ) {
    failures.push(rules.loanDetails.loanTerm.errorMessage);
  }

  return failures;
}

interface LikelihoodInput {
  isEligible: boolean;
  dti: number;
  lti: number;
  creditScore: number;
  disposableAfterRepayment: number;
}

function computeApprovalLikelihood(input: LikelihoodInput): number {
  const { isEligible, dti, lti, creditScore, disposableAfterRepayment } = input;
  const w = LIKELIHOOD_WEIGHTS;

  if (!isEligible) {
    return LIKELIHOOD_MIN;
  }

  let score = w.base;

  if (disposableAfterRepayment > 0) score += w.healthyDisposable;
  if (dti <= 20) score += w.lowDti;
  if (Number.isFinite(creditScore) && creditScore >= 650) score += w.strongCredit;
  if (!Number.isFinite(creditScore)) score -= w.missingCredit;
  // LTI above the soft threshold lowers the score but does not block the
  // application. A large loan relative to income warrants more scrutiny.
  if (lti > MAX_LTI) score -= w.excessiveLti;

  return clamp(score, LIKELIHOOD_MIN, LIKELIHOOD_MAX);
}

function riskCategoryFor(likelihood: number): RiskCategory {
  for (const band of RISK_BANDS) {
    if (likelihood >= band.minLikelihood) return band.category;
  }
  return 'high';
}

function buildDecisionReason(failures: string[], creditScore: number): string {
  if (failures.length > 0) {
    return failures.join('; ');
  }
  if (!Number.isFinite(creditScore)) {
    return 'Eligible. No credit score provided — assuming the highest risk band.';
  }
  return 'Strong income-to-expense ratio and manageable existing debt';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}
