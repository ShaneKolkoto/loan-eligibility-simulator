import { useCallback, useState } from 'react';
import { ApiError, checkEligibility } from '@/services/loans/client';
import type { EligibilityRequest, EligibilityResponse } from '@/services/loans/types';

interface UseEligibilityResult {
  data: EligibilityResponse | null;
  lastRequest: EligibilityRequest | null;
  isLoading: boolean;
  error: string | null;
  submit: (payload: EligibilityRequest) => Promise<void>;
  reset: () => void;
}

export function useEligibility(): UseEligibilityResult {
  const [data, setData] = useState<EligibilityResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<EligibilityRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (payload: EligibilityRequest) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    setLastRequest(payload);
    try {
      const result = await checkEligibility(payload);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLastRequest(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, lastRequest, isLoading, error, submit, reset };
}
