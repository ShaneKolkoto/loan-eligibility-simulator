import type { LoanPurpose } from './shared';

export interface InterestRateRange {
  min: number;
  max: number;
}

export interface LoanProduct {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minTerm: number;
  maxTerm: number;
  interestRateRange: InterestRateRange;
  purposes: LoanPurpose[];
}

export interface LoanProductsResponse {
  products: LoanProduct[];
}
