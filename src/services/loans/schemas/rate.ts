import { z } from 'zod';

export const calculateRateRequestSchema = z.object({
  loanAmount: z.number().positive(),
  loanTerm: z.number().int().positive(),
  creditScore: z.number().int().nonnegative(),
  loanType: z.string(),
});

export const paymentScheduleEntrySchema = z.object({
  month: z.number().int().positive(),
  payment: z.number().nonnegative(),
  principal: z.number().nonnegative(),
  interest: z.number().nonnegative(),
  balance: z.number().nonnegative(),
});

export const calculateRateResponseSchema = z.object({
  interestRate: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  totalInterest: z.number().nonnegative(),
  totalRepayment: z.number().nonnegative(),
  paymentSchedule: z.array(paymentScheduleEntrySchema),
});

export type CalculateRateResponseFromSchema = z.infer<typeof calculateRateResponseSchema>;
