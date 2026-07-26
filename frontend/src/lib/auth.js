import { API_BASE_URL } from '../config';

/** Ends the server session, clears the local cache, and returns to sign-in. */
export async function signOut(navigate) {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    /* The cookie is cleared server-side on the next valid request either way. */
  } finally {
    ['isAuthenticated', 'username', 'sessionId', 'apiConfigured'].forEach((key) =>
      localStorage.removeItem(key)
    );
    navigate('/login', { replace: true });
  }
}
