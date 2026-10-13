import { useCallback, useEffect, useState } from 'react';
import { ApiError, getValidationRules } from '@/services/loans/client';
import type { ValidationRulesResponse } from '@/services/loans/types';

interface UseValidationRulesResult {
  rules: ValidationRulesResponse | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch the validation rules the form uses to validate input.
 *
 * Rules come from the API rather than being hard-coded, mirroring the spec's
 * `/validation-rules` endpoint. A product change to a threshold is therefore
 * a data change, not a frontend release.
 */
export function useValidationRules(): UseValidationRulesResult {
  const [rules, setRules] = useState<ValidationRulesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getValidationRules();
        if (!cancelled) setRules(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load validation rules');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { rules, isLoading, error, reload };
}
