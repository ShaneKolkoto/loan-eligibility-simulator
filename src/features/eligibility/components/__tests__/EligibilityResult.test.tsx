import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EligibilityResult } from '../EligibilityResult/EligibilityResult';
import type { EligibilityResponse, LoanProduct } from '@/services/loans/types';

const products: LoanProduct[] = [
  {
    id: 'personal_loan',
    name: 'Personal Loan',
    description: 'Flexible personal financing for various needs',
    minAmount: 5000,
    maxAmount: 300000,
    minTerm: 6,
    maxTerm: 60,
    interestRateRange: { min: 10.5, max: 18.5 },
    purposes: ['debt_consolidation', 'home_improvement', 'education', 'medical', 'other'],
  },
  {
    id: 'vehicle_loan',
    name: 'Vehicle Finance',
    description: 'Financing for new and used vehicles',
    minAmount: 50000,
    maxAmount: 1500000,
    minTerm: 12,
    maxTerm: 72,
    interestRateRange: { min: 8.5, max: 15.0 },
    purposes: ['new_vehicle', 'used_vehicle'],
  },
];

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
    render(
      <EligibilityResult
        result={eligibleResponse}
        products={products}
        loanPurpose="home_improvement"
      />,
    );
    expect(screen.getByText(/you may qualify/i)).toBeInTheDocument();
    expect(screen.getByText(/strong income-to-expense ratio/i)).toBeInTheDocument();
  });

  it('shows a danger alert when not eligible', () => {
    render(
      <EligibilityResult
        result={rejectedResponse}
        products={products}
        loanPurpose="home_improvement"
      />,
    );
    expect(screen.getByText(/not eligible/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum monthly income/i)).toBeInTheDocument();
  });

  it('renders the recommended loan figures', () => {
    render(
      <EligibilityResult
        result={eligibleResponse}
        products={products}
        loanPurpose="home_improvement"
      />,
    );
    expect(screen.getByText(/12\.50%/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('shows the matched product when eligible', () => {
    render(
      <EligibilityResult
        result={eligibleResponse}
        products={products}
        loanPurpose="home_improvement"
      />,
    );
    expect(screen.getByText(/matched product/i)).toBeInTheDocument();
    expect(screen.getByText('Personal Loan')).toBeInTheDocument();
  });

  it('shows Vehicle Finance when the applicant chose a vehicle purpose', () => {
    render(
      <EligibilityResult result={eligibleResponse} products={products} loanPurpose="new_vehicle" />,
    );
    expect(screen.getByText('Vehicle Finance')).toBeInTheDocument();
  });

  it('hides the matched product when not eligible', () => {
    render(
      <EligibilityResult
        result={rejectedResponse}
        products={products}
        loanPurpose="home_improvement"
      />,
    );
    expect(screen.queryByText(/matched product/i)).not.toBeInTheDocument();
  });
});
