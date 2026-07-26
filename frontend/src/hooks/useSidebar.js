import { useCallback, useEffect, useState } from 'react';

export const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const DESKTOP_QUERY = '(min-width: 1024px)';

/* localStorage throws outright in some privacy modes, so every touch is guarded
   and a failure just falls back to the expanded default. */
function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
  } catch {
    /* Persistence is a nicety — the session still works without it. */
  }
}

function matchesDesktop() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(DESKTOP_QUERY).matches
    : true;
}

/**
 * The shell's navigation state. Two independent axes, one viewport switch:
 *
 *   desktop (≥1024px) — `collapsed` picks between the 288px panel and the
 *                       72px icon rail. Persisted under `sidebarCollapsed`.
 *   mobile  (<1024px) — `mobileOpen` drives an overlay drawer with a scrim.
 *                       The rail never applies here.
 */
export function useSidebar() {
  const [isDesktop, setIsDesktop] = useState(matchesDesktop);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => {
      setIsDesktop(e.matches);
      /* Crossing into desktop must not leave a stale drawer flag behind. */
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  return {
    isDesktop,
    /* Never report the rail on mobile — there the drawer is full width. */
    collapsed: isDesktop && collapsed,
    toggleCollapsed,
    mobileOpen,
    openMobile,
    closeMobile,
    toggleMobile,
  };
}

export default useSidebar;
