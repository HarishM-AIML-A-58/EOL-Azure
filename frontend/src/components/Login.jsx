import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, User, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AuthShell from './AuthShell';
import { Button, Field, PasswordInput, TextInput } from './ui';

const DEMO_USER = { username: 'hr_demo_user', password: 'DemoPassword123!' };

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /* ProtectedRoute stashes the page they were trying to reach. */
  const destination = location.state?.from || '/dashboard';

  /* If a session cookie is still valid, skip the form entirely. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.authenticated) {
          localStorage.setItem('username', data.user.username);
          navigate(destination, { replace: true });
        }
      } catch {
        /* Offline or backend down — leave the form up. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, destination]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      if (!username || !password) {
        setError('Enter both a username and a password.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('username', data.user.username);
          navigate(destination, { replace: true });
        } else {
          setError(data.detail || 'Invalid username or password.');
        }
      } catch {
        setError('Network error. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [username, password, navigate, destination]
  );

  const handleDemoAccess = useCallback(async () => {
    setDemoLoading(true);
    setError('');
    try {
      /* Idempotent: a 409 here just means the demo account already exists. */
      await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEMO_USER),
      });
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(DEMO_USER),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('username', DEMO_USER.username);
        navigate(destination, { replace: true });
      } else {
        setError('Could not start the demo session. Try signing in instead.');
      }
    } catch {
      setError('Network error while starting the demo session.');
    } finally {
      setDemoLoading(false);
    }
  }, [navigate, destination]);

  const busy = loading || demoLoading;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your workspace credentials to reach the analysis platform."
      footer={
        <p className="text-center text-caption text-on-dark-muted">
          No account yet?{' '}
          <Link to="/register" className="link-on-dark">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field id="username" label="Username">
          <TextInput
            id="username"
            polarity="dark"
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            autoComplete="username"
            disabled={busy}
          />
        </Field>

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            polarity="dark"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            disabled={busy}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-hair-violet bg-canvas-dark px-4 py-3 text-caption text-pink"
          >
            <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" variant="inverted" loading={loading} disabled={busy} className="mt-1 w-full">
          {loading ? 'Authenticating' : 'Sign in'}
        </Button>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-hair-violet" aria-hidden="true" />
          <span className="micro-cap text-on-dark-muted">or</span>
          <span className="h-px flex-1 bg-hair-violet" aria-hidden="true" />
        </div>

        <Button
          variant="ghostDark"
          onClick={handleDemoAccess}
          loading={demoLoading}
          disabled={busy}
          icon={Zap}
          className="w-full"
        >
          {demoLoading ? 'Starting demo' : 'Instant demo access'}
        </Button>

        <p className="text-caption text-on-dark-muted">
          Demo access signs you into a shared read-only account so you can walk the workflow end to end.
        </p>
      </form>
    </AuthShell>
  );
}

export default Login;
