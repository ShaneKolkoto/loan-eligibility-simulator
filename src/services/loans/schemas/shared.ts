import { z } from 'zod';

export const employmentStatusSchema = z.enum([
  'employed',
  'self_employed',
  'unemployed',
  'retired',
]);

export const loanPurposeSchema = z.enum([
  'debt_consolidation',
  'home_improvement',
  'education',
  'medical',
  'other',
  'new_vehicle',
  'used_vehicle',
]);

export const riskCategorySchema = z.enum(['low', 'medium', 'high']);

export const affordabilityScoreSchema = z.enum(['poor', 'fair', 'good', 'excellent']);
