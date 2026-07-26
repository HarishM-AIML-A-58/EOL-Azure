/**
 * API origin.
 *
 * Default is same-origin (''): in production FastAPI serves this bundle, and
 * in development Vite proxies /api to the backend (see vite.config.js). Both
 * keep the session cookie first-party, so CORS never enters the picture.
 *
 * Set VITE_API_BASE_URL only when the frontend is hosted separately from the
 * API — that deployment also needs the origin added to ALLOWED_ORIGINS on the
 * backend.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
