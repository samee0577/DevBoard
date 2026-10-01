import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import authClient from '../auth';
import { enterDemoMode, exitDemoMode, isDemoMode } from '../features/demo/demoMode';

type User = {
  email?: string | null;
  name?: string | null;
};

export default function Auth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  // Whether this browser has already been in the sandbox, so a returning guest is
  // offered their own work back rather than being told to start over.
  const [hasDemoSession, setHasDemoSession] = useState(() => isDemoMode());

  useEffect(() => {
    authClient.getSession().then((result) => {
      const sessionData = result?.data?.session;
      const userData = result?.data?.user;

      if (sessionData && userData) {
        setSession(sessionData);
        setUser(userData);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (session && user) {
      // A real session always wins. Clearing the demo flag here stops a stale guest
      // flag from outliving the sandbox and being read as "this user is a guest".
      // No state reset is needed: this branch navigates away and unmounts.
      exitDemoMode();
      navigate('/dashboard', { replace: true });
    }
  }, [session, user, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');

    if (!import.meta.env.VITE_NEON_AUTH_URL) {
      setAuthError('Missing VITE_NEON_AUTH_URL in your frontend .env file.');
      return;
    }

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: email.split('@')[0] || 'User',
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setAuthError(result.error.message || 'Authentication failed');
        return;
      }

      const sessionResult = await authClient.getSession();
      const sessionData = sessionResult?.data?.session;
      const userData = sessionResult?.data?.user;

      if (sessionData && userData) {
        setSession(sessionData);
        setUser(userData);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/dashboard`,
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in failed');
    }
  };

  const handleExploreAsGuest = () => {
    // No session is created and no token is minted: demo mode is purely a client-side
    // flag. Clearing the cache first guarantees no real-user data from an earlier
    // session can render inside the sandbox, in either direction.
    queryClient.clear();
    enterDemoMode();
    setHasDemoSession(true);
    navigate('/demo/dashboard');
  };

  if (loading) return <div className="auth-loading">Loading...</div>;

  if (session && user) {
    return <div className="auth-loading">Loading...</div>;
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-kicker">WELCOME BACK</p>
          <h1>{isSignUp ? 'Create your account' : 'Sign in to DevBoard'}</h1>
        </div>

        <button type="button" className="auth-google" onClick={handleGoogleSignIn}>
          <span className="auth-google-mark">G</span>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-field-control">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {authError && <p className="auth-error">{authError}</p>}

          <button type="submit" className="auth-button auth-button--primary">
            {isSignUp ? 'Sign Up' : 'LogIn'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => { setIsSignUp(false); setShowPassword(false); }}
              >
                LogIn
              </button>
            </>
          ) : (
            <>
              Don’t have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => { setIsSignUp(true); setShowPassword(false); }}
              >
                Sign up
              </button>
            </>
          )}
        </p>

        <div className="auth-guest">
          <div className="auth-divider">
            <span>or just look around</span>
          </div>
          <button type="button" className="auth-button auth-button--guest" onClick={handleExploreAsGuest}>
            {hasDemoSession ? 'Resume your demo' : 'Explore as guest'}
          </button>
          <p className="auth-guest-hint">
            {hasDemoSession
              ? 'Pick up your sample workspace where you left it. Nothing you do here is saved to the database.'
              : "Browse a sample project without an account. Editing is enabled, but nothing is saved to the database."}
          </p>
        </div>
      </div>
    </div>
  );
}
