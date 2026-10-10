import { http, HttpResponse, type HttpResponseResolver } from 'msw';
import { amortize, evaluateEligibility, interestRateFor } from '@/domain/eligibility';
import { eligibilityRequestSchema } from '@/services/loans/schemas';
import type {
  CalculateRateRequest,
  EligibilityRequest,
  LoanProductsResponse,
  ValidationRulesResponse,
} from '@/services/loans/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validationRules: ValidationRulesResponse = {
  personalInfo: {
    age: { min: 18, max: 65, required: true, errorMessage: 'Age must be between 18 and 65' },
    employmentStatus: {
      required: true,
      options: ['employed', 'self_employed', 'unemployed', 'retired'],
      errorMessage: 'Please select your employment status',
    },
    employmentDuration: {
      min: 3,
      required: true,
      errorMessage: 'Minimum 3 months employment required',
    },
  },
  financialInfo: {
    monthlyIncome: {
      min: 5000,
      required: true,
      errorMessage: 'Minimum monthly income of R5,000 required',
    },
    monthlyExpenses: {
      min: 0,
      required: true,
      errorMessage: 'Please enter your monthly expenses',
    },
    creditScore: {
      min: 300,
      max: 850,
      required: false,
      errorMessage: 'Credit score must be between 300 and 850',
    },
  },
  loanDetails: {
    requestedAmount: {
      min: 5000,
      max: 300000,
      required: true,
      errorMessage: 'Loan amount must be between R5,000 and R300,000',
    },
    loanTerm: {
      min: 6,
      max: 60,
      required: true,
      errorMessage: 'Loan term must be between 6 and 60 months',
    },
  },
};

const products: LoanProductsResponse = {
  products: [
    {
      id: 'personal_loan',
      name: 'Personal Loan',
      description: 'Flexible personal financing for various needs',
      minAmount: 5000,
      maxAmount: 300000,
      minTerm: 6,
      maxTerm: 60,
      interestRateRange: { min: 10.5, max: 18.5 },
      purposes: ['debt_consolidation', 'home_improvement', 'education', 'medical', 'other'],
    },
    {
      id: 'vehicle_loan',
      name: 'Vehicle Finance',
      description: 'Financing for new and used vehicles',
      minAmount: 50000,
      maxAmount: 1500000,
      minTerm: 12,
      maxTerm: 72,
      interestRateRange: { min: 8.5, max: 15.0 },
      purposes: ['new_vehicle', 'used_vehicle'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Resolvers
//
// Typed explicitly as HttpResponseResolver so the destructured `request`
// argument is typed. Without this, MSW v3 leaves it as `any` and
// `noImplicitAny` (via `strict`) flags it.
// ---------------------------------------------------------------------------

const eligibilityResolver: HttpResponseResolver = async ({ request }) => {
  const body = await request.json();
  const parsed = eligibilityRequestSchema.safeParse(body);

  if (!parsed.success) {
    return HttpResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = evaluateEligibility(parsed.data as EligibilityRequest, validationRules);
  return HttpResponse.json(result);
};

const calculateRateResolver: HttpResponseResolver = async ({ request }) => {
  const body = (await request.json()) as CalculateRateRequest;

  const rate = interestRateFor(body.creditScore, body.loanType);
  const amort = amortize({
    principal: body.loanAmount,
    annualRate: rate,
    termMonths: body.loanTerm,
  });

  return HttpResponse.json({
    interestRate: rate,
    monthlyPayment: amort.monthlyPayment,
    totalInterest: amort.totalInterest,
    totalRepayment: amort.totalRepayment,
    paymentSchedule: amort.schedule,
  });
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers = [
  // 1. Eligibility check
  http.post('/api/loans/eligibility', eligibilityResolver),

  // 2. Loan products
  http.get('/api/loans/products', () => HttpResponse.json(products)),

  // 3. Interest rate calculator
  http.post('/api/loans/calculate-rate', calculateRateResolver),

  // 4. Validation rules
  http.get('/api/loans/validation-rules', () => HttpResponse.json(validationRules)),
];
