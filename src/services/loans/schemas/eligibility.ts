import { z } from 'zod';
import {
  affordabilityScoreSchema,
  employmentStatusSchema,
  loanPurposeSchema,
  riskCategorySchema,
} from './shared';

// -- Request --

export const personalInfoSchema = z.object({
  age: z.number().int().nonnegative(),
  employmentStatus: employmentStatusSchema,
  employmentDuration: z.number().int().nonnegative(),
});

export const financialInfoSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  existingDebt: z.number().nonnegative(),
  creditScore: z.number().int().nonnegative(),
});

export const loanDetailsSchema = z.object({
  requestedAmount: z.number().positive(),
  loanTerm: z.number().int().positive(),
  loanPurpose: loanPurposeSchema,
});

export const eligibilityRequestSchema = z.object({
  personalInfo: personalInfoSchema,
  financialInfo: financialInfoSchema,
  loanDetails: loanDetailsSchema,
});

// -- Response --

export const eligibilityResultSchema = z.object({
  isEligible: z.boolean(),
  approvalLikelihood: z.number().min(0).max(100),
  riskCategory: riskCategorySchema,
  decisionReason: z.string(),
});

export const recommendedLoanSchema = z.object({
  maxAmount: z.number().nonnegative(),
  recommendedAmount: z.number().nonnegative(),
  interestRate: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  totalRepayment: z.number().nonnegative(),
});

export const affordabilityAnalysisSchema = z.object({
  disposableIncome: z.number(),
  // DTI and LTI are ratios expressed as percentages, but neither is bounded
  // at 100 — an applicant owing 3× their income has a DTI of 300. Capping
  // these would reject legitimate (if undesirable) responses.
  debtToIncomeRatio: z.number().nonnegative(),
  loanToIncomeRatio: z.number().nonnegative(),
  affordabilityScore: affordabilityScoreSchema,
});

export const eligibilityResponseSchema = z.object({
  eligibilityResult: eligibilityResultSchema,
  recommendedLoan: recommendedLoanSchema,
  affordabilityAnalysis: affordabilityAnalysisSchema,
});

// -- Inferred types (used to cross-check the hand-written interfaces) --

export type EligibilityRequestFromSchema = z.infer<typeof eligibilityRequestSchema>;
export type EligibilityResponseFromSchema = z.infer<typeof eligibilityResponseSchema>;