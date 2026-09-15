import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authClient from '../auth';

type User = {
  email?: string | null;
  name?: string | null;
};

export default function Auth() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

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

  const handleSignOut = async () => {
    await authClient.signOut();
    setSession(null);
    setUser(null);
  };

  if (loading) return <div className="auth-loading">Loading...</div>;

  if (session && user) {
    return (
      <div className="auth-shell auth-shell--logged-in">
        <div className="auth-card auth-card--simple">
          <h1>Logged in as {user?.email ?? 'User'}</h1>
          <button className="auth-button auth-button--primary" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>
    );
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
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {authError && <p className="auth-error">{authError}</p>}

          <button type="submit" className="auth-button auth-button--primary">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => setIsSignUp(false)}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don’t have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => setIsSignUp(true)}
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}