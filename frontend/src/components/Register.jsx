import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, ShieldCheck, User } from 'lucide-react';
import { API_BASE_URL } from '../config';
import AuthShell from './AuthShell';
import { Button, Field, PasswordInput, TextInput } from './ui';

/* Mirrors backend/app/auth_utils.py — keep the two in step. */
const MIN_USERNAME = 3;
const MIN_PASSWORD = 6;

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Strong'];

function scorePassword(password) {
  if (password.length < MIN_PASSWORD) return 0;
  let score = 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 0.5;
  if (/\d/.test(password)) score += 0.5;
  if (/[^A-Za-z0-9]/.test(password)) score += 0.5;
  return Math.min(3, Math.floor(score));
}

function StrengthMeter({ password }) {
  const score = useMemo(() => scorePassword(password), [password]);
  if (!password) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? 'bg-lime' : 'bg-on-dark-faint'}`}
          />
        ))}
      </div>
      <span className="micro-cap text-on-dark-muted">{STRENGTH_LABELS[score]}</span>
    </div>
  );
}

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');

      if (!username || !password || !confirmPassword) {
        setError('All fields are required.');
        return;
      }
      if (username.trim().length < MIN_USERNAME) {
        setError(`Username must be at least ${MIN_USERNAME} characters.`);
        return;
      }
      if (password.length < MIN_PASSWORD) {
        setError(`Password must be at least ${MIN_PASSWORD} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setError('The two passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          navigate('/login', { replace: true });
        } else {
          setError(data.detail || 'Registration failed.');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [username, password, confirmPassword, navigate]
  );

  return (
    <AuthShell
      title="Create an account"
      subtitle="Set up access to the component resilience platform."
      footer={
        <p className="text-center text-caption text-on-dark-muted">
          Already registered?{' '}
          <Link to="/login" className="link-on-dark">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field id="reg-username" label="Username" hint={`At least ${MIN_USERNAME} characters`}>
          <TextInput
            id="reg-username"
            polarity="dark"
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            disabled={loading}
          />
        </Field>

        <Field id="reg-password" label="Password">
          <PasswordInput
            id="reg-password"
            polarity="dark"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
            disabled={loading}
          />
          <StrengthMeter password={password} />
        </Field>

        <Field id="reg-confirm" label="Confirm password">
          <PasswordInput
            id="reg-confirm"
            polarity="dark"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat the password"
            autoComplete="new-password"
            disabled={loading}
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

        <Button type="submit" variant="inverted" loading={loading} disabled={loading} className="mt-1 w-full">
          {loading ? 'Creating account' : 'Create account'}
        </Button>

        <p className="flex items-start gap-2 text-caption text-on-dark-muted">
          <ShieldCheck size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          Passwords are hashed with bcrypt. Plain text is never stored or logged.
        </p>
      </form>
    </AuthShell>
  );
}

export default Register;
