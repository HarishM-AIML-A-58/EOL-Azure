import { useCallback, useState } from 'react';

export const PREFERENCES_KEY = 'appSettings';

export const DEFAULT_PREFERENCES = {
  /* Priority every specification row starts at. */
  defaultPriority: 2,
  /* Export the workbook as soon as the alternatives search succeeds. */
  autoDownload: false,
};

export function readPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
    return { ...DEFAULT_PREFERENCES, ...(stored.preferences || {}) };
  } catch {
    /* Corrupt payload — defaults are always safe. */
    return { ...DEFAULT_PREFERENCES };
  }
}

/** Preferences plus a setter that persists them. Browser-local by design. */
export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences);

  const update = useCallback((key, value) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ preferences: next }));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    setPreferences({ ...DEFAULT_PREFERENCES });
  }, []);

  return { preferences, update, reset };
}
