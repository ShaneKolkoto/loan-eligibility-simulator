import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../evaluate';
import type { EligibilityRequest, ValidationRulesResponse } from '@/services/loans/types';

const rules: ValidationRulesResponse = {
  personalInfo: {
    age: { min: 18, max: 65, required: true, errorMessage: 'Age must be between 18 and 65' },
    employmentStatus: {
      required: true,
      options: ['employed', 'self_employed', 'unemployed', 'retired'],
      errorMessage: 'Please select your employment status',
    },
    employmentDuration: {
      min: 3,
      required: true,
      errorMessage: 'Minimum 3 months employment required',
    },
  },
  financialInfo: {
    monthlyIncome: {
      min: 5000,
      required: true,
      errorMessage: 'Minimum monthly income of R5,000 required',
    },
    monthlyExpenses: {
      min: 0,
      required: true,
      errorMessage: 'Please enter your monthly expenses',
    },
    creditScore: {
      min: 300,
      max: 850,
      required: false,
      errorMessage: 'Credit score must be between 300 and 850',
    },
  },
  loanDetails: {
    requestedAmount: {
      min: 5000,
      max: 300000,
      required: true,
      errorMessage: 'Loan amount must be between R5,000 and R300,000',
    },
    loanTerm: {
      min: 6,
      max: 60,
      required: true,
      errorMessage: 'Loan term must be between 6 and 60 months',
    },
  },
};

const baseRequest: EligibilityRequest = {
  personalInfo: {
    age: 35,
    employmentStatus: 'employed',
    employmentDuration: 24,
  },
  financialInfo: {
    monthlyIncome: 25_000,
    monthlyExpenses: 15_000,
    existingDebt: 5_000,
    creditScore: 650,
  },
  loanDetails: {
    requestedAmount: 150_000,
    loanTerm: 24,
    loanPurpose: 'home_improvement',
  },
};

describe('evaluateEligibility', () => {
  it('returns a complete, shaped response for the spec example', () => {
    const result = evaluateEligibility(baseRequest, rules);

    expect(result).toHaveProperty('eligibilityResult');
    expect(result).toHaveProperty('recommendedLoan');
    expect(result).toHaveProperty('affordabilityAnalysis');
  });

  it('rejects the spec example applicant on serviceability', () => {
    // The spec's example shows isEligible: true, but the applicant has
    // R5,000 disposable and the R150,000/24-month instalment is R7,096.
    // They cannot service the loan. See README.
    const result = evaluateEligibility(baseRequest, rules);

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/disposable income/i);
  });

  it('produces a monthly payment matching the amortization formula', () => {
    const result = evaluateEligibility(baseRequest, rules);

    expect(result.recommendedLoan.monthlyPayment).toBeCloseTo(7096.1, 1);
  });

  it('accepts an applicant within the ratio thresholds', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        financialInfo: {
          monthlyIncome: 25_000,
          monthlyExpenses: 8_000,
          existingDebt: 2_000,
          creditScore: 700,
        },
        loanDetails: {
          requestedAmount: 10_000,
          loanTerm: 24,
          loanPurpose: 'home_improvement',
        },
      },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(true);
  });

  it('approves a high-LTI applicant who can service the repayment', () => {
    // The R25,000 loan is 100% of monthly income, well above the 60% soft
    // threshold — but R24,985 of disposable income easily covers the
    // R1,230 instalment. Serviceability, not LTI, gates a term loan.
    //
    // creditScore is 600, above the 550 minimum, so the LTI/serviceability
    // behaviour is isolated. A lower score would fail on the credit gate
    // before the serviceability check ran.
    const result = evaluateEligibility(
      {
        ...baseRequest,
        financialInfo: {
          monthlyIncome: 25_000,
          monthlyExpenses: 15,
          existingDebt: 0,
          creditScore: 600,
        },
        loanDetails: {
          requestedAmount: 25_000,
          loanTerm: 12,
          loanPurpose: 'home_improvement',
        },
      },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(true);
    expect(result.affordabilityAnalysis.loanToIncomeRatio).toBe(100);
    // The LTI soft penalty still applies to the risk score.
    expect(result.eligibilityResult.riskCategory).toBe('medium');
  });

  it('rejects an applicant who cannot service the repayment', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        financialInfo: {
          monthlyIncome: 25_000,
          monthlyExpenses: 24_990,
          existingDebt: 0,
          creditScore: 700,
        },
        loanDetails: {
          requestedAmount: 25_000,
          loanTerm: 12,
          loanPurpose: 'home_improvement',
        },
      },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/disposable income after repayment/i);
  });

  it('rejects an applicant whose DTI exceeds the threshold', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        personalInfo: {
          ...baseRequest.personalInfo,
          employmentStatus: 'employed',
          employmentDuration: 24,
        },
        financialInfo: {
          monthlyIncome: 15_000,
          monthlyExpenses: 10_000,
          existingDebt: 1_000_000,
          creditScore: 300,
        },
        loanDetails: { ...baseRequest.loanDetails, requestedAmount: 100_000, loanTerm: 32 },
      },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/debt-to-income/i);
  });

  it('rejects an unemployed applicant with a clear reason', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        personalInfo: {
          ...baseRequest.personalInfo,
          employmentStatus: 'unemployed',
          employmentDuration: 0,
        },
      },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/unemployed/i);
  });

  it('does not enforce employment duration for a retiree', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        personalInfo: {
          ...baseRequest.personalInfo,
          employmentStatus: 'retired',
          employmentDuration: 0,
        },
        financialInfo: {
          monthlyIncome: 25_000,
          monthlyExpenses: 8_000,
          existingDebt: 2_000,
          creditScore: 700,
        },
        loanDetails: {
          requestedAmount: 10_000,
          loanTerm: 24,
          loanPurpose: 'home_improvement',
        },
      },
      rules,
    );

    expect(result.eligibilityResult.decisionReason).not.toMatch(/employment duration/i);
    expect(result.eligibilityResult.isEligible).toBe(true);
  });

  it('rejects applicants below the minimum income', () => {
    const result = evaluateEligibility(
      { ...baseRequest, financialInfo: { ...baseRequest.financialInfo, monthlyIncome: 3_000 } },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/income/i);
  });

  it('flags a high DTI in the affordability analysis', () => {
    const result = evaluateEligibility(
      { ...baseRequest, financialInfo: { ...baseRequest.financialInfo, existingDebt: 15_000 } },
      rules,
    );

    expect(result.affordabilityAnalysis.debtToIncomeRatio).toBeGreaterThan(40);
  });

  it('rejects applicants outside the age range', () => {
    const result = evaluateEligibility(
      { ...baseRequest, personalInfo: { ...baseRequest.personalInfo, age: 17 } },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
  });

  it('rejects applicants with too-short employment history', () => {
    const result = evaluateEligibility(
      { ...baseRequest, personalInfo: { ...baseRequest.personalInfo, employmentDuration: 1 } },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/3 months/i);
  });

  it('flags a missing credit score in the decision reason', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        financialInfo: { ...baseRequest.financialInfo, creditScore: Number.NaN },
        loanDetails: { ...baseRequest.loanDetails, requestedAmount: 10_000 },
      },
      rules,
    );

    expect(result.eligibilityResult.decisionReason).toMatch(/credit/i);
  });

  it('declines an applicant whose credit score is below the minimum', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        financialInfo: {
          ...baseRequest.financialInfo,
          creditScore: 412,
        },
        loanDetails: {
          requestedAmount: 5_000,
          loanTerm: 6,
          loanPurpose: 'other',
        },
      },
      rules,
    );

    expect(result.eligibilityResult.isEligible).toBe(false);
    expect(result.eligibilityResult.decisionReason).toMatch(/credit score/i);
  });

  it('approves an applicant with a missing credit score, priced at the worst band', () => {
    const result = evaluateEligibility(
      {
        ...baseRequest,
        financialInfo: {
          ...baseRequest.financialInfo,
          creditScore: Number.NaN,
        },
        loanDetails: {
          requestedAmount: 10_000,
          loanTerm: 24,
          loanPurpose: 'home_improvement',
        },
      },
      rules,
    );

    // Missing score is not a decline — it's flagged and priced at the top band.
    expect(result.eligibilityResult.isEligible).toBe(true);
    expect(result.eligibilityResult.decisionReason).toMatch(/credit/i);
  });
});
