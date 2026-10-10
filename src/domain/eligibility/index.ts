/**
 * Public surface of the eligibility domain.
 *
 * Everything outside this folder imports from here, not from the individual
 * modules. That keeps the internal file layout free to change without
 * rippling through the app.
 *
 *   import { evaluateEligibility } from '@/domain/eligibility';
 *   // not
 *   import { evaluateEligibility } from '@/domain/eligibility/evaluate';
 */

// Functions — the domain's public API.
export { evaluateEligibility } from './evaluate';
export { assessAffordability } from './affordability';
export { amortize } from './amortization';
export { interestRateFor } from './rates';

// Types — for consumers that need to name the domain's inputs/outputs.
export type { AffordabilityInput, AffordabilityOutput } from './affordability';
export type { AmortizationInput, AmortizationOutput } from './amortization';
