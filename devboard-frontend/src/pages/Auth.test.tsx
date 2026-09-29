import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from './Auth';
import authClient from '../auth';

vi.mock('../auth', () => ({
  default: {
    getSession: vi.fn(),
    signOut: vi.fn(),
    signUp: { email: vi.fn() },
    signIn: { email: vi.fn() },
    signInSocial: vi.fn(),
  },
}));

// Auth redirects to /dashboard as soon as a session exists, which unmounts the
// sign-out button. Stub navigation so the sign-out handler can be exercised.
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockedAuthClient = vi.mocked(authClient);

const signedIn = {
  data: {
    session: { token: 'a.jwt.token', userId: 'user-1' },
    user: { id: 'user-1', email: 'someone@example.com' },
  },
};

function renderAuth(queryClient: QueryClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Auth />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Auth sign out', () => {
  beforeEach(() => {
    mockedAuthClient.getSession.mockReset();
    mockedAuthClient.signOut.mockReset();
    mockedAuthClient.getSession.mockResolvedValue(signedIn as never);
    mockedAuthClient.signOut.mockResolvedValue(undefined as never);
  });

  it('clears cached queries so the previous user data cannot be read back', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['projects'], [{ id: 1, name: 'private project' }]);
    queryClient.setQueryData(['projects', '1'], { id: 1, features: [] });

    renderAuth(queryClient);

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(queryClient.getQueryData(['projects'])).toBeUndefined();
    });
    expect(queryClient.getQueryData(['projects', '1'])).toBeUndefined();
  });

  it('keeps the cache when sign out fails, since the session is likely still valid', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['projects'], [{ id: 1, name: 'private project' }]);

    mockedAuthClient.signOut.mockRejectedValue(new Error('sign out failed') as never);

    renderAuth(queryClient);

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    expect(queryClient.getQueryData(['projects'])).toBeDefined();
  });

  it('surfaces the failure instead of silently doing nothing', async () => {
    const queryClient = new QueryClient();
    mockedAuthClient.signOut.mockRejectedValue(new Error('sign out failed') as never);

    renderAuth(queryClient);

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    expect(await screen.findByText('sign out failed')).toBeInTheDocument();
  });

  it('removes active observers so no in-flight query repopulates the cache', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['projects'], [{ id: 1 }]);

    renderAuth(queryClient);

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    });
  });
});
