import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EligibilityForm } from '../EligibilityForm/EligibilityForm';
import type { ValidationRulesResponse } from '@/services/loans/types';

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

describe('EligibilityForm', () => {
  it('shows errors when submitting an empty form', async () => {
    const onSubmit = vi.fn();
    render(<EligibilityForm rules={rules} isSubmitting={false} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /check eligibility/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submits a valid form', async () => {
    const onSubmit = vi.fn();
    render(<EligibilityForm rules={rules} isSubmitting={false} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/age/i), '35');
    await userEvent.selectOptions(screen.getByLabelText(/employment status/i), 'employed');
    await userEvent.type(screen.getByLabelText(/months in current employment/i), '24');
    await userEvent.type(screen.getByLabelText(/monthly income/i), '25000');
    await userEvent.type(screen.getByLabelText(/monthly expenses/i), '15000');
    await userEvent.type(screen.getByLabelText(/existing monthly debt/i), '5000');
    await userEvent.type(screen.getByLabelText(/credit score/i), '650');
    await userEvent.type(screen.getByLabelText(/requested amount/i), '150000');
    await userEvent.type(screen.getByLabelText(/term/i), '24');
    await userEvent.selectOptions(screen.getByLabelText(/purpose/i), 'home_improvement');

    await userEvent.click(screen.getByRole('button', { name: /check eligibility/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload?.financialInfo.monthlyIncome).toBe(25000);
  });

  it('rejects an income below the minimum', async () => {
    const onSubmit = vi.fn();
    render(<EligibilityForm rules={rules} isSubmitting={false} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/monthly income/i), '3000');
    await userEvent.click(screen.getByRole('button', { name: /check eligibility/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/minimum monthly income/i).length).toBeGreaterThan(0);
  });
});