import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { useLoanProducts } from '../useLoanProducts';

describe('useLoanProducts', () => {
  it('loads the catalogue', async () => {
    const { result } = renderHook(() => useLoanProducts());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products[0]?.id).toBe('personal_loan');
    expect(result.current.error).toBeNull();
  });

  it('exposes an error when the request fails', async () => {
    server.use(
      http.get('/api/loans/products', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );

    const { result } = renderHook(() => useLoanProducts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/status 500/);
    expect(result.current.products).toEqual([]);
  });
});
