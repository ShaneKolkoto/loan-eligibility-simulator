import { z } from 'zod';

export const numericRuleSchema = z.object({
  min: z.number(),
  max: z.number().optional(),
  required: z.boolean(),
  errorMessage: z.string(),
});

export const enumRuleSchema = z.object({
  required: z.boolean(),
  options: z.array(z.string()),
  errorMessage: z.string(),
});

export const validationRulesResponseSchema = z.object({
  personalInfo: z.object({
    age: numericRuleSchema,
    employmentStatus: enumRuleSchema,
    employmentDuration: numericRuleSchema,
  }),
  financialInfo: z.object({
    monthlyIncome: numericRuleSchema,
    monthlyExpenses: numericRuleSchema,
    creditScore: numericRuleSchema,
  }),
  loanDetails: z.object({
    requestedAmount: numericRuleSchema,
    loanTerm: numericRuleSchema,
  }),
});

export type ValidationRulesFromSchema = z.infer<typeof validationRulesResponseSchema>;
