import { useCallback, useEffect, useState } from 'react';
import { ApiError, getLoanProducts } from '@/services/loans/client';
import type { LoanProduct } from '@/services/loans/types';

interface UseLoanProductsResult {
  products: LoanProduct[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch the loan product catalogue.
 *
 * The catalogue is small and changes rarely, so it's fetched once on mount
 * rather than per submission. `reload` is exposed for a retry button.
 */
export function useLoanProducts(): UseLoanProductsResult {
  const [products, setProducts] = useState<LoanProduct[]>([]);
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
        const result = await getLoanProducts();
        if (!cancelled) setProducts(result.products);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load loan products');
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

  return { products, isLoading, error, reload };
}
