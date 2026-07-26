import { API_BASE_URL } from '../config';

/** Thrown for any non-2xx response so callers get one error shape. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readError(res, fallback) {
  try {
    const data = await res.json();
    if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
  } catch {
    /* Non-JSON body — fall through to the generic message. */
  }
  return fallback;
}

async function request(path, { method = 'GET', body, raw = false, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — the engine could not be reached.', 0);
  }

  if (!res.ok) {
    throw new ApiError(await readError(res, `Request failed (${res.status})`), res.status);
  }
  return raw ? res : res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  postRaw: (path, body) => request(path, { method: 'POST', body, raw: true }),
  getRaw: (path) => request(path, { raw: true }),
};

/** Streams a blob response to the user's downloads folder. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse a timestamp from the API.
 *
 * The backend serialises `datetime.utcnow()` with `.isoformat()`, which emits
 * no zone designator. `new Date()` reads a bare date-time as *local* time, so
 * in UTC+5:30 every stamp in the product read five and a half hours stale — a
 * lookup made a moment ago showed as "6h ago". Assume UTC when no offset is
 * present, and honour one when it is.
 */
function parseStamp(iso) {
  if (typeof iso !== 'string' || !iso) return new Date(NaN);
  const hasZone = /(?:Z|z|[+-]\d{2}:?\d{2})$/.test(iso.trim());
  return new Date(hasZone ? iso : `${iso.trim()}Z`);
}

/** "3 minutes ago" style stamps for history and report lists. */
export function relativeTime(iso) {
  const then = parseStamp(iso);
  if (Number.isNaN(then.getTime())) return '—';
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  /* Clock skew between host and browser can put a fresh stamp slightly in the
     future; "in -1m" is worse than rounding to now. */
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function absoluteTime(iso) {
  const date = parseStamp(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
