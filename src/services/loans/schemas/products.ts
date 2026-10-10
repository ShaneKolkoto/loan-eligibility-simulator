import { z } from 'zod';
import { loanPurposeSchema } from './shared';

export const interestRateRangeSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
});

export const loanProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().nonnegative(),
  minTerm: z.number().int().positive(),
  maxTerm: z.number().int().positive(),
  interestRateRange: interestRateRangeSchema,
  purposes: z.array(loanPurposeSchema),
});

export const loanProductsResponseSchema = z.object({
  products: z.array(loanProductSchema),
});

export type LoanProductsResponseFromSchema = z.infer<typeof loanProductsResponseSchema>;