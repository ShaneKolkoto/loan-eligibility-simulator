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
  MONEY_DP,
  RISK_BANDS,
} from './constants';

/**
 * Evaluate a loan application end-to-end.
 *
 * Orchestrates: rule checks → affordability → ratio gates → pricing →
 * likelihood → risk. The MSW handler calls exactly this function, so the
 * mocked backend and the real domain logic can never drift.
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

  // Ratio gates. These are not part of the API's validation-rules endpoint
  // — they're credit policy. An applicant can pass every field-level rule
  // and still be far too leveraged to service another loan, so we gate here.
  if (affordability.debtToIncomeRatio > MAX_DTI) {
    failures.push(
      `Debt-to-income ratio of ${affordability.debtToIncomeRatio.toFixed(1)}% exceeds the maximum of ${MAX_DTI}%`,
    );
  }
  if (affordability.loanToIncomeRatio > MAX_LTI) {
    failures.push(
      `Loan-to-income ratio of ${affordability.loanToIncomeRatio.toFixed(1)}% exceeds the maximum of ${MAX_LTI}%`,
    );
  }

  const interestRate = interestRateFor(financialInfo.creditScore, 'personal_loan');
  const amort = amortize({
    principal: loanDetails.requestedAmount,
    annualRate: interestRate,
    termMonths: loanDetails.loanTerm,
  });

  // Serviceability informs likelihood only. The ratio gates above reject
  // the over-leveraged case, and this feeds the risk score for applicants
  // who do pass.
  const disposableAfterRepayment = round(
    affordability.disposableIncome - amort.monthlyPayment,
    MONEY_DP,
  );

  const isEligible = failures.length === 0;

  const approvalLikelihood = computeApprovalLikelihood({
    isEligible,
    dti: affordability.debtToIncomeRatio,
    creditScore: financialInfo.creditScore,
    disposableAfterRepayment,
  });
  const riskCategory = riskCategoryFor(approvalLikelihood);

  // What the applicant could borrow under the LTI ceiling, minus existing
  // debt. Clamped at zero: an over-indebted applicant cannot borrow more
  // just because their income is high.
  const ltiCeiling = financialInfo.monthlyIncome * (MAX_LTI / 100);
  const maxAmount = round(Math.max(0, ltiCeiling - financialInfo.existingDebt), MONEY_DP);

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

  if (personalInfo.employmentDuration < rules.personalInfo.employmentDuration.min) {
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
  creditScore: number;
  disposableAfterRepayment: number;
}

function computeApprovalLikelihood(input: LikelihoodInput): number {
  const { isEligible, dti, creditScore, disposableAfterRepayment } = input;
  const w = LIKELIHOOD_WEIGHTS;

  if (!isEligible) {
    return LIKELIHOOD_MIN;
  }

  let score = w.base;

  if (disposableAfterRepayment > 0) score += w.healthyDisposable;
  if (dti <= 20) score += w.lowDti;
  if (Number.isFinite(creditScore) && creditScore >= 650) score += w.strongCredit;
  if (!Number.isFinite(creditScore)) score -= w.missingCredit;

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