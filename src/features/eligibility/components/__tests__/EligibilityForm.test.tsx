import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EligibilityForm } from '../EligibilityForm/EligibilityForm';
import type { LoanProduct, ValidationRulesResponse } from '@/services/loans/types';

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

async function completeStep1() {
  await userEvent.type(screen.getByLabelText(/age/i), '35');
  await userEvent.click(screen.getByLabelText(/^employed$/i));
  await userEvent.type(screen.getByLabelText(/months in current employment/i), '24');
}

async function completeStep2() {
  await userEvent.type(screen.getByLabelText(/monthly income/i), '25000');
  await userEvent.type(screen.getByLabelText(/monthly expenses/i), '8000');
  await userEvent.type(screen.getByLabelText(/existing monthly debt/i), '2000');
  await userEvent.type(screen.getByLabelText(/credit score/i), '700');
}

describe('EligibilityForm stepper', () => {
  it('starts on the first step and hides later fields', () => {
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly income/i)).not.toBeInTheDocument();
  });

  it('does not advance past an invalid step', async () => {
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('advances to step 2 once step 1 is valid', async () => {
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await completeStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByLabelText(/monthly income/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/age/i)).not.toBeInTheDocument();
  });

  it('preserves values when going back', async () => {
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await completeStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByLabelText(/age/i)).toHaveValue(35);
  });

  it('submits the full payload from the final step', async () => {
    const onSubmit = vi.fn();
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await completeStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await completeStep2();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await userEvent.click(screen.getByLabelText(/home improvement/i));
    await userEvent.type(screen.getByLabelText(/requested amount/i), '10000');
    await userEvent.click(screen.getByLabelText(/24 months/i));
    await userEvent.click(screen.getByRole('button', { name: /check eligibility/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload?.financialInfo.monthlyIncome).toBe(25000);
    expect(payload?.loanDetails.loanTerm).toBe(24);
    expect(payload?.loanDetails.loanPurpose).toBe('home_improvement');
    expect(payload?.personalInfo.employmentStatus).toBe('employed');
  });

  it('shows a live disposable-income preview on step 2', async () => {
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await completeStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await userEvent.type(screen.getByLabelText(/monthly income/i), '25000');
    await userEvent.type(screen.getByLabelText(/monthly expenses/i), '8000');

    expect(await screen.findByText(/disposable income/i)).toBeInTheDocument();
  });

  it('hides the 6-month term when Vehicle Finance is selected', async () => {
    render(
      <EligibilityForm
        rules={rules}
        products={products}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await completeStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await completeStep2();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await userEvent.click(screen.getByLabelText(/vehicle finance/i));

    expect(screen.queryByLabelText(/^6 months$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/12 months/i)).toBeInTheDocument();
  });
});