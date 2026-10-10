import type { AffordabilityScore, EmploymentStatus, LoanPurpose, RiskCategory } from './shared';

export interface PersonalInfo {
  age: number;
  employmentStatus: EmploymentStatus;
  /** Months in current employment. */
  employmentDuration: number;
}

export interface FinancialInfo {
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebt: number;
  creditScore: number;
}

export interface LoanDetails {
  requestedAmount: number;
  /** Term in months. */
  loanTerm: number;
  loanPurpose: LoanPurpose;
}

export interface EligibilityRequest {
  personalInfo: PersonalInfo;
  financialInfo: FinancialInfo;
  loanDetails: LoanDetails;
}

export interface EligibilityResult {
  isEligible: boolean;
  /** 0–100. */
  approvalLikelihood: number;
  riskCategory: RiskCategory;
  decisionReason: string;
}

export interface RecommendedLoan {
  maxAmount: number;
  recommendedAmount: number;
  /** Annual percentage rate. */
  interestRate: number;
  monthlyPayment: number;
  totalRepayment: number;
}

export interface AffordabilityAnalysis {
  disposableIncome: number;
  /**
   * Existing debt as a percentage of monthly income. Not bounded at 100:
   * an applicant owing 3× their income has a DTI of 300. Used for display
   * and scoring, and as a gate in the domain layer.
   */
  debtToIncomeRatio: number;
  /**
   * Requested loan as a percentage of monthly income. Not bounded at 100:
   * a loan of 6× monthly income yields 600.
   */
  loanToIncomeRatio: number;
  affordabilityScore: AffordabilityScore;
}

export interface EligibilityResponse {
  eligibilityResult: EligibilityResult;
  recommendedLoan: RecommendedLoan;
  affordabilityAnalysis: AffordabilityAnalysis;
}