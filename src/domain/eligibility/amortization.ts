import type { PaymentScheduleEntry } from '@/services/loans/types/rate';
import { MONEY_DP, MONTHS_PER_YEAR } from './constants';

export interface AmortizationInput {
  principal: number;
  annualRate: number; // e.g. 12.5 (percent, not fraction)
  termMonths: number;
}

export interface AmortizationOutput {
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: PaymentScheduleEntry[];
}

/**
 * Calculate a loan's monthly payment and full amortization schedule.
 *
 * Standard annuity formula:
 *
 *     M = P · r / (1 − (1 + r)^−n)
 *
 * where P is the principal, r the monthly interest rate (annual / 12 / 100),
 * and n the term in months. A zero-rate loan is handled separately to avoid
 * dividing by zero.
 *
 * Note: the API specification's worked example shows R7,089.50 for
 * R150,000 at 12.5% over 24 months, but the formula yields R7,096.10.
 * The implementation follows the formula. See README → Decisions.
 *
 * Pure function. Money values are rounded to cents at each step so the
 * final balance lands on exactly zero.
 */
export function amortize(input: AmortizationInput): AmortizationOutput {
  const { principal, annualRate, termMonths } = input;

  if (termMonths <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalRepayment: 0, schedule: [] };
  }

  // Do NOT round this — rounding the monthly rate introduces cents-level
  // drift across the schedule, enough to shift the payment by several rand.
  const monthlyRate = annualRate / 100 / MONTHS_PER_YEAR;

  const rawMonthlyPayment = computeMonthlyPayment(principal, monthlyRate, termMonths);
  const monthlyPayment = round(rawMonthlyPayment, MONEY_DP);

  const schedule: PaymentScheduleEntry[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= termMonths; month += 1) {
    const interest = round(balance * monthlyRate, MONEY_DP);

    const isFinalPayment = month === termMonths;
    const principalPortion = isFinalPayment
      ? round(balance, MONEY_DP)
      : round(monthlyPayment - interest, MONEY_DP);

    const payment = round(principalPortion + interest, MONEY_DP);
    balance = round(balance - principalPortion, MONEY_DP);
    totalInterest = round(totalInterest + interest, MONEY_DP);

    schedule.push({
      month,
      payment,
      principal: principalPortion,
      interest,
      balance: Math.max(balance, 0),
    });
  }

  const totalRepayment = round(principal + totalInterest, MONEY_DP);

  return {
    monthlyPayment: Number.isFinite(monthlyPayment) ? monthlyPayment : 0,
    totalInterest,
    totalRepayment,
    schedule,
  };
}

function computeMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  const growth = (1 + monthlyRate) ** termMonths;
  return (principal * monthlyRate * growth) / (growth - 1);
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}
