import { useCallback, useState } from 'react';
import { ApiError, checkEligibility } from '@/services/loans/client';
import type { EligibilityRequest, EligibilityResponse } from '@/services/loans/types';

interface UseEligibilityResult {
  data: EligibilityResponse | null;
  isLoading: boolean;
  error: string | null;
  submit: (payload: EligibilityRequest) => Promise<void>;
  reset: () => void;
}

/**
 * Submit an eligibility request and expose the result.
 *
 * The result is kept until the next submission, so the UI can render the
 * outcome without re-fetching. `reset` clears it — useful if the user edits
 * the form and wants the panel to go back to its empty state.
 */
export function useEligibility(): UseEligibilityResult {
  const [data, setData] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (payload: EligibilityRequest) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await checkEligibility(payload);
      setData(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, submit, reset };
}