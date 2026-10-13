import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input/Input';

describe('Input', () => {
  it('associates its label with the input', () => {
    render(<Input label="Monthly income" />);
    expect(screen.getByLabelText('Monthly income')).toBeInTheDocument();
  });

  it('links the error message to the input via aria-describedby', () => {
    render(<Input label="Email" error="Email is required" />);

    const input = screen.getByLabelText('Email');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('Email is required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('announces the error to assistive technology', () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  });

  it('links the hint via aria-describedby when there is no error', () => {
    render(<Input label="Credit score" hint="Optional. 300–850." />);

    const input = screen.getByLabelText('Credit score');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('Optional. 300–850.');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('accepts typed input', async () => {
    render(<Input label="Age" type="number" />);

    const input = screen.getByLabelText('Age');
    await userEvent.type(input, '35');

    expect(input).toHaveValue(35);
  });

  it('renders a currency prefix when provided', () => {
    render(<Input label="Income" prefix="R" />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });
});
