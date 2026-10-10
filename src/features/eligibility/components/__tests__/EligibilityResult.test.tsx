    import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EligibilityResult } from '../EligibilityResult/EligibilityResult';
import type { EligibilityResponse } from '@/services/loans/types';

const eligibleResponse: EligibilityResponse = {
  eligibilityResult: {
    isEligible: true,
    approvalLikelihood: 85,
    riskCategory: 'low',
    decisionReason: 'Strong income-to-expense ratio',
  },
  recommendedLoan: {
    maxAmount: 150000,
    recommendedAmount: 150000,
    interestRate: 12.5,
    monthlyPayment: 7096.1,
    totalRepayment: 170306.3,
  },
  affordabilityAnalysis: {
    disposableIncome: 5000,
    debtToIncomeRatio: 20,
    loanToIncomeRatio: 600,
    affordabilityScore: 'fair',
  },
};

const rejectedResponse: EligibilityResponse = {
  ...eligibleResponse,
  eligibilityResult: {
    isEligible: false,
    approvalLikelihood: 0,
    riskCategory: 'high',
    decisionReason: 'Minimum monthly income of R5,000 required',
  },
};

describe('EligibilityResult', () => {
  it('shows a success alert when eligible', () => {
    render(<EligibilityResult result={eligibleResponse} />);
    expect(screen.getByText(/you may qualify/i)).toBeInTheDocument();
    expect(screen.getByText(/strong income-to-expense ratio/i)).toBeInTheDocument();
  });

  it('shows a danger alert when not eligible', () => {
    render(<EligibilityResult result={rejectedResponse} />);
    expect(screen.getByText(/not eligible/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum monthly income/i)).toBeInTheDocument();
  });

  it('renders the recommended loan figures', () => {
    render(<EligibilityResult result={eligibleResponse} />);
    expect(screen.getByText(/12\.50%/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });
});