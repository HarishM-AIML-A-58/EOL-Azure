import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';

/**
 * Auth gate. The session lives in an HttpOnly cookie, so the only way to know
 * whether it is still valid is to ask the server.
 */
function ProtectedRoute({ children }) {
  const [state, setState] = useState('checking'); // checking | in | out
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) {
          setState('out');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.authenticated && data.user) {
          localStorage.setItem('username', data.user.username);
          setState('in');
        } else {
          setState('out');
        }
      } catch {
        if (!cancelled) setState('out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas-light">
        <div className="flex flex-col items-center gap-3">
          <span className="spinner text-violet-mid" role="status" aria-label="Checking your session" />
          <p className="micro-cap text-ink-faint">Checking your session</p>
        </div>
      </div>
    );
  }

  if (state === 'out') {
    /* Remember where they were headed so sign-in can send them back. */
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
