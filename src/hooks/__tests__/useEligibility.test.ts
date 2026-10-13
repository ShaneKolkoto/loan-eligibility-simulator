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
    monthlyExpenses: 8_000,
    existingDebt: 2_000,
    creditScore: 700,
  },
  loanDetails: {
    requestedAmount: 10_000,
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

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.eligibilityResult.isEligible).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('retains the last submitted request', async () => {
    const { result } = renderHook(() => useEligibility());

    await act(async () => {
      await result.current.submit(payload);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastRequest?.loanDetails.loanPurpose).toBe('home_improvement');
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
    expect(result.current.lastRequest).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
