import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

/**
 * The authenticated user, read from the session cookie rather than
 * localStorage. localStorage is only a cache so the shell can paint a name
 * before the round-trip lands.
 */
export function useCurrentUser() {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('username');
    return cached ? { username: cached } : null;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setUser(data);
        localStorage.setItem('username', data.username);
      } catch {
        /* Keep the cached name; ProtectedRoute owns the redirect. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}

export default useCurrentUser;
