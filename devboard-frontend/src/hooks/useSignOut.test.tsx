import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSignOut } from './useSignOut';
import authClient from '../auth';

vi.mock('../auth', () => ({
  default: {
    signOut: vi.fn(),
  },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockedAuthClient = vi.mocked(authClient);

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

function renderSignOut(queryClient: QueryClient) {
  return renderHook(() => useSignOut(), { wrapper: wrapper(queryClient) });
}

describe('useSignOut', () => {
  beforeEach(() => {
    mockedAuthClient.signOut.mockReset();
    mockedAuthClient.signOut.mockResolvedValue(undefined as never);
  });

  it('clears cached queries so the previous user data cannot be read back', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['projects'], [{ id: 1, name: 'private project' }]);
    queryClient.setQueryData(['projects', '1'], { id: 1, features: [] });

    const { result } = renderSignOut(queryClient);

    await act(async () => {
      await result.current.handleSignOut();
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(['projects'])).toBeUndefined();
    });
    expect(queryClient.getQueryData(['projects', '1'])).toBeUndefined();
  });

  it('keeps the cache when sign out fails, since the session is likely still valid', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['projects'], [{ id: 1, name: 'private project' }]);

    mockedAuthClient.signOut.mockRejectedValue(new Error('sign out failed') as never);

    const { result } = renderSignOut(queryClient);

    await act(async () => {
      await result.current.handleSignOut();
    });

    expect(queryClient.getQueryData(['projects'])).toBeDefined();
  });

  it('surfaces the failure instead of silently doing nothing', async () => {
    const queryClient = new QueryClient();

    mockedAuthClient.signOut.mockRejectedValue(new Error('sign out failed') as never);

    const { result } = renderSignOut(queryClient);

    await act(async () => {
      await result.current.handleSignOut();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('sign out failed');
    });
  });

  it('removes active observers so no in-flight query repopulates the cache', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['projects'], [{ id: 1 }]);

    const { result } = renderSignOut(queryClient);

    await act(async () => {
      await result.current.handleSignOut();
    });

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    });
  });
});
