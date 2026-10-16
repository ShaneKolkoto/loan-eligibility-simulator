import type { EligibilityRequest, ValidationRulesResponse } from '@/services/loans/types';

export type FieldErrors = Partial<Record<string, string>>;

/**
 * The form's shape. Everything is a string because that's what an
 * `<input>` gives you; we coerce to numbers at submit time.
 *
 * Employment duration is split into years and months, matching how people
 * describe tenure. The two are combined into total months at request time.
 */
export interface FormValues {
  age: string;
  employmentStatus: string;
  employmentYears: string;
  employmentMonths: string;
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
  employmentYears: '',
  employmentMonths: '',
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
 * Employment duration is validated per status:
 *
 * - Employed / self-employed: minimum months in current employment, from
 *   the API's validation rules.
 * - Retired: no duration requirement. Pension and investment income count
 *   as qualifying income; the retirement duration tells us nothing about
 *   creditworthiness.
 * - Unemployed: rejected. There is no income to service a loan, and the
 *   duration field is not the deciding factor.
 *
 * Returns a map of field → error message. An empty object means valid.
 */
export function validateForm(values: FormValues, rules: ValidationRulesResponse): FieldErrors {
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
  } else if (values.employmentStatus === 'unemployed') {
    errors.employmentStatus =
      'Unemployed applicants are not eligible. Please apply when you have a source of income.';
  }

  // Employment duration — only validated for applicants who are working.
  const isWorking =
    values.employmentStatus === 'employed' || values.employmentStatus === 'self_employed';

  if (isWorking) {
    const years = toNumber(values.employmentYears);
    const months = toNumber(values.employmentMonths);

    if (values.employmentYears === '' && values.employmentMonths === '') {
      errors.employmentYears = 'Employment duration is required';
    } else {
      const totalMonths = (years ?? 0) * 12 + (months ?? 0);
      if (totalMonths < rules.personalInfo.employmentDuration.min) {
        errors.employmentYears = rules.personalInfo.employmentDuration.errorMessage;
      }
    }
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
  const years = values.employmentYears === '' ? 0 : Number(values.employmentYears);
  const months = values.employmentMonths === '' ? 0 : Number(values.employmentMonths);

  return {
    personalInfo: {
      age: Number(values.age),
      employmentStatus:
        values.employmentStatus as EligibilityRequest['personalInfo']['employmentStatus'],
      employmentDuration: years * 12 + months,
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

/**
 * Validate only the fields belonging to a given step. Used by the stepper
 * so each step can gate advancement without validating fields the user
 * hasn't reached yet.
 */
export function validateStep(
  step: 'about-you' | 'finances' | 'loan',
  values: FormValues,
  rules: ValidationRulesResponse,
): FieldErrors {
  const allErrors = validateForm(values, rules);
  const fieldsForStep: Record<typeof step, (keyof FormValues)[]> = {
    'about-you': ['age', 'employmentStatus', 'employmentYears', 'employmentMonths'],
    finances: ['monthlyIncome', 'monthlyExpenses', 'existingDebt', 'creditScore'],
    loan: ['requestedAmount', 'loanTerm', 'loanPurpose'],
  };

  const relevant = fieldsForStep[step];
  const stepErrors: FieldErrors = {};
  for (const field of relevant) {
    const message = allErrors[field];
    if (message) stepErrors[field] = message;
  }
  return stepErrors;
}
