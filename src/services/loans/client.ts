import {
  calculateRateResponseSchema,
  eligibilityResponseSchema,
  loanProductsResponseSchema,
  validationRulesResponseSchema,
} from './schemas';
import type {
  CalculateRateRequest,
  CalculateRateResponse,
  EligibilityRequest,
  EligibilityResponse,
  LoanProductsResponse,
  ValidationRulesResponse,
} from './types';

/**
 * Base URL for the loans API.
 *
 * Defaults to `/api` so MSW can intercept relative paths in dev and test.
 * In a deployed environment this would come from `VITE_API_BASE_URL`.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * A typed error thrown when the API responds with a non-2xx status, or when
 * the response body fails schema validation. Distinguishing the two cases
 * lets the UI show a meaningful message.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly issues?: unknown;

  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function checkEligibility(payload: EligibilityRequest): Promise<EligibilityResponse> {
  return post('/loans/eligibility', payload, eligibilityResponseSchema);
}

export function calculateRate(payload: CalculateRateRequest): Promise<CalculateRateResponse> {
  return post('/loans/calculate-rate', payload, calculateRateResponseSchema);
}

export function getLoanProducts(): Promise<LoanProductsResponse> {
  return get('/loans/products', loanProductsResponseSchema);
}

export function getValidationRules(): Promise<ValidationRulesResponse> {
  return get('/loans/validation-rules', validationRulesResponseSchema);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface Schema<T> {
  safeParse: (
    value: unknown,
  ) => { success: true; data: T } | { success: false; error: { issues: unknown } };
}

async function get<T>(path: string, schema: Schema<T>): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return handle<T>(response, schema);
}

async function post<TInput, TOutput>(
  path: string,
  body: TInput,
  schema: Schema<TOutput>,
): Promise<TOutput> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handle<TOutput>(response, schema);
}

async function handle<T>(response: Response, schema: Schema<T>): Promise<T> {
  if (!response.ok) {
    // A real backend returns a structured error body. Fall back to status
    // text if the body isn't JSON.
    let issues: unknown;
    try {
      const body = await response.json();
      issues = body;
    } catch {
      issues = undefined;
    }
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      issues,
    );
  }

  const raw = await response.json();
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {

    throw new ApiError(
      'The server returned an unexpected response shape',
      response.status,
      parsed.error.issues,
    );
  }

  return parsed.data;
}