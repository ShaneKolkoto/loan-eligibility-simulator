export type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'retired';

export type LoanPurpose =
  | 'debt_consolidation'
  | 'home_improvement'
  | 'education'
  | 'medical'
  | 'other'
  | 'new_vehicle' // ← never offered in the UI
  | 'used_vehicle'; // ← never offered in the UI

export type RiskCategory = 'low' | 'medium' | 'high';

export type AffordabilityScore = 'poor' | 'fair' | 'good' | 'excellent';
