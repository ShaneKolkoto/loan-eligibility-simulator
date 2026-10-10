import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { useValidationRules } from '../useValidationRules';

describe('useValidationRules', () => {
  it('loads rules from the API', async () => {
    const { result } = renderHook(() => useValidationRules());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rules).not.toBeNull();
    expect(result.current.rules?.personalInfo.age.min).toBe(18);
    expect(result.current.error).toBeNull();
  });

  it('exposes an error when the request fails', async () => {
    server.use(
      http.get('/api/loans/validation-rules', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useValidationRules());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/status 500/);
    expect(result.current.rules).toBeNull();
  });
});