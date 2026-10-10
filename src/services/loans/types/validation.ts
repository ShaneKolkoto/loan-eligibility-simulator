export interface NumericRule {
  min: number;
  max?: number;
  required: boolean;
  errorMessage: string;
}

export interface EnumRule {
  required: boolean;
  options: string[];
  errorMessage: string;
}

export interface ValidationRulesResponse {
  personalInfo: {
    age: NumericRule;
    employmentStatus: EnumRule;
    employmentDuration: NumericRule;
  };
  financialInfo: {
    monthlyIncome: NumericRule;
    monthlyExpenses: NumericRule;
    creditScore: NumericRule;
  };
  loanDetails: {
    requestedAmount: NumericRule;
    loanTerm: NumericRule;
  };
}
