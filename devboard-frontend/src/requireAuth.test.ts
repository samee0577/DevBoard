import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSession, requireAuthLoader } from './requireAuth';
import authClient from './auth';

vi.mock('./auth', () => ({
  default: {
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

const mockedGetSession = vi.mocked(authClient.getSession);

type Settled =
  | { resolved: true; value: unknown }
  | { resolved: false; error: Response };

async function settle(promise: Promise<unknown>): Promise<Settled> {
  return promise.then(
    (value) => ({ resolved: true, value }),
    (error) => ({ resolved: false, error: error as Response }),
  );
}

const validSession = {
  data: {
    session: { token: 'a.jwt.token', userId: 'user-1' },
    user: { id: 'user-1', email: 'someone@example.com' },
  },
};

describe('getSession', () => {
  beforeEach(() => {
    mockedGetSession.mockReset();
  });

  it('returns the session and user when both are present', async () => {
    mockedGetSession.mockResolvedValue(validSession as never);

    await expect(getSession()).resolves.toEqual({
      session: validSession.data.session,
      user: validSession.data.user,
    });
  });

  it('returns null when there is no session', async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null, user: null } } as never);

    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when the session exists but the user is missing', async () => {
    mockedGetSession.mockResolvedValue({ data: { session: { token: 't' }, user: null } } as never);

    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when the data envelope itself is absent', async () => {
    mockedGetSession.mockResolvedValue({} as never);

    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null instead of throwing when the request fails', async () => {
    mockedGetSession.mockRejectedValue(new Error('network down'));

    await expect(getSession()).resolves.toBeNull();
  });
});

describe('requireAuthLoader', () => {
  beforeEach(() => {
    mockedGetSession.mockReset();
  });

  it('passes the session through when the user is authenticated', async () => {
    mockedGetSession.mockResolvedValue(validSession as never);

    await expect(requireAuthLoader()).resolves.toEqual({
      session: validSession.data.session,
      user: validSession.data.user,
    });
  });

  it('throws a 302 redirect to / when there is no session', async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null, user: null } } as never);

    const thrown = await settle(requireAuthLoader());

    expect(thrown.resolved).toBe(false);
    if (thrown.resolved) throw new Error('expected the loader to throw');
    expect(thrown.error.status).toBe(302);
    expect(thrown.error.headers.get('Location')).toBe('/');
  });

  it('throws a 302 redirect to / when the session lookup rejects', async () => {
    mockedGetSession.mockRejectedValue(new Error('auth server unreachable'));

    const thrown = await settle(requireAuthLoader());

    expect(thrown.resolved).toBe(false);
    if (thrown.resolved) throw new Error('expected the loader to throw');
    expect(thrown.error.status).toBe(302);
    expect(thrown.error.headers.get('Location')).toBe('/');
  });

  it('does not return a loader value when unauthenticated', async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null, user: null } } as never);

    let returned: unknown = 'not-set';

    await requireAuthLoader()
      .then((value) => {
        returned = value;
      })
      .catch(() => {});

    expect(returned).toBe('not-set');
  });
});
