import type { EligibilityRequest, ValidationRulesResponse } from '@/services/loans/types';

export type FieldErrors = Partial<Record<string, string>>;

/**
 * The form's shape. Everything is a string because that's what an
 * `<input>` gives you; we coerce to numbers at submit time.
 */
export interface FormValues {
  age: string;
  employmentStatus: string;
  employmentDuration: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  existingDebt: string;
  creditScore: string;
  requestedAmount: string;
  loanTerm: string;
  loanPurpose: string;
}

export const emptyForm: FormValues = {
  age: '',
  employmentStatus: '',
  employmentDuration: '',
  monthlyIncome: '',
  monthlyExpenses: '',
  existingDebt: '',
  creditScore: '',
  requestedAmount: '',
  loanTerm: '',
  loanPurpose: '',
};

/**
 * Validate the form against the API-supplied rules.
 *
 * Returns a map of field → error message. An empty object means valid.
 * All fields are checked; nothing short-circuits, so the user sees every
 * problem at once rather than one at a time.
 */
export function validateForm(
  values: FormValues,
  rules: ValidationRulesResponse,
): FieldErrors {
  const errors: FieldErrors = {};

  // Age
  const age = toNumber(values.age);
  if (values.age === '' || age === null) {
    errors.age = 'Age is required';
  } else if (age < rules.personalInfo.age.min) {
    errors.age = rules.personalInfo.age.errorMessage;
  } else if (rules.personalInfo.age.max !== undefined && age > rules.personalInfo.age.max) {
    errors.age = rules.personalInfo.age.errorMessage;
  }

  // Employment status
  if (!values.employmentStatus) {
    errors.employmentStatus = rules.personalInfo.employmentStatus.errorMessage;
  }

  // Employment duration
  const duration = toNumber(values.employmentDuration);
  if (values.employmentDuration === '' || duration === null) {
    errors.employmentDuration = 'Employment duration is required';
  } else if (duration < rules.personalInfo.employmentDuration.min) {
    errors.employmentDuration = rules.personalInfo.employmentDuration.errorMessage;
  }

  // Monthly income
  const income = toNumber(values.monthlyIncome);
  if (values.monthlyIncome === '' || income === null) {
    errors.monthlyIncome = 'Monthly income is required';
  } else if (income < rules.financialInfo.monthlyIncome.min) {
    errors.monthlyIncome = rules.financialInfo.monthlyIncome.errorMessage;
  }

  // Monthly expenses
  const expenses = toNumber(values.monthlyExpenses);
  if (values.monthlyExpenses === '' || expenses === null) {
    errors.monthlyExpenses = rules.financialInfo.monthlyExpenses.errorMessage;
  } else if (expenses < rules.financialInfo.monthlyExpenses.min) {
    errors.monthlyExpenses = rules.financialInfo.monthlyExpenses.errorMessage;
  }

  // Existing debt — optional, but if given must be non-negative
  const debt = toNumber(values.existingDebt);
  if (values.existingDebt !== '' && (debt === null || debt < 0)) {
    errors.existingDebt = 'Existing debt must be zero or more';
  }

  // Credit score — optional
  if (values.creditScore !== '') {
    const score = toNumber(values.creditScore);
    if (score === null) {
      errors.creditScore = 'Credit score must be a number';
    } else if (score < rules.financialInfo.creditScore.min) {
      errors.creditScore = rules.financialInfo.creditScore.errorMessage;
    } else if (
      rules.financialInfo.creditScore.max !== undefined &&
      score > rules.financialInfo.creditScore.max
    ) {
      errors.creditScore = rules.financialInfo.creditScore.errorMessage;
    }
  }

  // Requested amount
  const amount = toNumber(values.requestedAmount);
  if (values.requestedAmount === '' || amount === null) {
    errors.requestedAmount = 'Loan amount is required';
  } else if (amount < rules.loanDetails.requestedAmount.min) {
    errors.requestedAmount = rules.loanDetails.requestedAmount.errorMessage;
  } else if (
    rules.loanDetails.requestedAmount.max !== undefined &&
    amount > rules.loanDetails.requestedAmount.max
  ) {
    errors.requestedAmount = rules.loanDetails.requestedAmount.errorMessage;
  }

  // Loan term
  const term = toNumber(values.loanTerm);
  if (values.loanTerm === '' || term === null) {
    errors.loanTerm = 'Loan term is required';
  } else if (term < rules.loanDetails.loanTerm.min) {
    errors.loanTerm = rules.loanDetails.loanTerm.errorMessage;
  } else if (
    rules.loanDetails.loanTerm.max !== undefined &&
    term > rules.loanDetails.loanTerm.max
  ) {
    errors.loanTerm = rules.loanDetails.loanTerm.errorMessage;
  }

  // Loan purpose
  if (!values.loanPurpose) {
    errors.loanPurpose = 'Please select a purpose';
  }

  return errors;
}

/**
 * Convert the string form values into the API request shape.
 * Assumes `validateForm` has already passed.
 */
export function toRequest(values: FormValues): EligibilityRequest {
  return {
    personalInfo: {
      age: Number(values.age),
      employmentStatus:
        values.employmentStatus as EligibilityRequest['personalInfo']['employmentStatus'],
      employmentDuration: Number(values.employmentDuration),
    },
    financialInfo: {
      monthlyIncome: Number(values.monthlyIncome),
      monthlyExpenses: Number(values.monthlyExpenses),
      existingDebt: values.existingDebt === '' ? 0 : Number(values.existingDebt),
      creditScore: values.creditScore === '' ? Number.NaN : Number(values.creditScore),
    },
    loanDetails: {
      requestedAmount: Number(values.requestedAmount),
      loanTerm: Number(values.loanTerm),
      loanPurpose: values.loanPurpose as EligibilityRequest['loanDetails']['loanPurpose'],
    },
  };
}

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}