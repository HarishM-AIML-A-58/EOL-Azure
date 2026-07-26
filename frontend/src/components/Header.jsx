import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Search, Settings, User, X } from 'lucide-react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { signOut } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { GitHubButton } from './ui';

/**
 * `nav-bar-light` — the product-surface top bar.
 *
 * The search box is a real affordance: it hands the part number to the
 * analysis workspace, which runs the lookup on arrival.
 *
 * `onMenuClick`/`sidebarOpen` drive the **mobile drawer only** — the hamburger
 * is `lg:hidden`. Desktop collapse lives on the sidebar's own toggle.
 */
function Header({ onMenuClick, sidebarOpen }) {
  const navigate = useNavigate();
  const menu = useRef(null);
  const user = useCurrentUser();
  const [query, setQuery] = useState('');

  const username = user?.username || 'Signed in';

  const handleSearch = (e) => {
    e.preventDefault();
    const part = query.trim();
    if (!part) return;
    navigate(`/analysis?part=${encodeURIComponent(part)}`);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-hair-cloud bg-canvas-light">
      <div className="gutter-x flex h-[72px] items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          className="btn btn-ghost btn-icon lg:hidden"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <form onSubmit={handleSearch} role="search" className="hidden max-w-sm flex-1 md:block xl:max-w-md 2xl:max-w-lg">
          <label htmlFor="global-part-search" className="sr-only">
            Search a part number
          </label>
          <div className="relative flex items-center">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 text-ink-faint" />
            <input
              id="global-part-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a part number…"
              className="field-input pl-9 text-[14px]"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-3">
          <GitHubButton polarity="light" />

          <span className="hidden h-8 w-px bg-hair-cloud md:block" aria-hidden="true" />

          <button
            type="button"
            onClick={(e) => menu.current?.toggle(e)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-press-light"
            aria-haspopup="menu"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-press-light text-ink-deep">
              <User size={18} aria-hidden="true" />
            </span>
            <span className="hidden flex-col items-start leading-none md:flex">
              <span className="text-[14px] font-medium text-ink-deep">{username}</span>
              <span className="micro-cap mt-0.5 text-ink-faint">Signed in</span>
            </span>
            <ChevronDown size={16} aria-hidden="true" className="text-ink-faint" />
          </button>

          <OverlayPanel ref={menu}>
            <div className="flex w-56 flex-col">
              <div className="border-b border-hair-cloud px-3 pb-3 pt-1">
                <p className="text-[14px] font-medium text-ink-deep">{username}</p>
                <p className="micro-cap text-ink-faint">Session active</p>
              </div>
              <Link
                to="/profile"
                onClick={() => menu.current?.hide()}
                className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-[14px] text-ink-muted transition-colors hover:bg-press-light hover:text-ink-deep"
              >
                <User size={16} aria-hidden="true" />
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => menu.current?.hide()}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-[14px] text-ink-muted transition-colors hover:bg-press-light hover:text-ink-deep"
              >
                <Settings size={16} aria-hidden="true" />
                Settings
              </Link>
              <span className="my-1 h-px bg-hair-cloud" aria-hidden="true" />
              <button
                type="button"
                onClick={() => signOut(navigate)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] text-ink-muted transition-colors hover:bg-press-light hover:text-ink-deep"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </OverlayPanel>
        </div>
      </div>
    </header>
  );
}

export default Header;
