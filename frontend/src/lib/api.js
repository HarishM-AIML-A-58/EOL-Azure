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

/** "3 minutes ago" style stamps for history and report lists. */
export function relativeTime(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function absoluteTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
