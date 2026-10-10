import { describe, it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { useEligibility } from '../useEligibility';
import type { EligibilityRequest } from '@/services/loans/types';

const payload: EligibilityRequest = {
  personalInfo: { age: 35, employmentStatus: 'employed', employmentDuration: 24 },
  financialInfo: {
    monthlyIncome: 25_000,
    monthlyExpenses: 15_000,
    existingDebt: 5_000,
    creditScore: 650,
  },
  loanDetails: {
    requestedAmount: 150_000,
    loanTerm: 24,
    loanPurpose: 'home_improvement',
  },
};

describe('useEligibility', () => {
it('returns a result on success', async () => {
  const { result } = renderHook(() => useEligibility());

  await act(async () => {
    await result.current.submit(payload);
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  // The spec's example applicant requests 6× their monthly income, so
  // under the LTI gate they are not eligible. The hook still returns a
  // complete, well-formed response — eligibility is just false.
  expect(result.current.data).not.toBeNull();
  expect(result.current.data?.eligibilityResult.isEligible).toBe(false);
  expect(result.current.data?.eligibilityResult.decisionReason).toMatch(/loan-to-income/i);
  expect(result.current.error).toBeNull();
});

  it('exposes an error when the request fails', async () => {
    server.use(
      http.post('/api/loans/eligibility', () =>
        HttpResponse.json({ error: 'server unavailable' }, { status: 503 }),
      ),
    );

    const { result } = renderHook(() => useEligibility());

    await act(async () => {
      await result.current.submit(payload);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/status 503/);
    expect(result.current.data).toBeNull();
  });

  it('clears state on reset', async () => {
    const { result } = renderHook(() => useEligibility());

    await act(async () => {
      await result.current.submit(payload);
    });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => result.current.reset());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});