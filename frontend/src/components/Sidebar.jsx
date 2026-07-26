import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { signOut } from '../lib/auth';
import { PRODUCT_NAME } from '../constants';
import { Brand } from './ui';

const MAIN = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analysis', label: 'Part analysis', icon: Search },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/history', label: 'History', icon: History },
];

const ACCOUNT = [
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

/* One row geometry for every control in the panel — nav links, the sign-out
   button and the collapse toggle all sit on the same 44px rhythm so the rail
   reads as a column of icons rather than a stack of odd boxes. */
function rowClasses(collapsed, active) {
  return cn(
    'flex w-full items-center rounded-md py-2.5 text-body-md transition-colors',
    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
    active
      ? 'bg-primary text-on-primary'
      : 'text-ink-muted hover:bg-press-light hover:text-ink-deep'
  );
}

function NavGroup({ heading, items, pathname, collapsed, divider = true, onNavigate }) {
  return (
    <div>
      {collapsed ? (
        /* The visible heading is the one thing the rail cannot keep, so a
           hairline stands in for it — except above the first group, which
           already sits under the brand row's border. The `aria-label` below
           preserves the grouping for screen readers either way. */
        divider && <span aria-hidden="true" className="mx-2 mb-2 block h-px bg-hair-cloud" />
      ) : (
        <p className="px-3 micro-cap text-ink-faint">{heading}</p>
      )}
      <ul className={cn('flex flex-col gap-1', !collapsed && 'mt-2')} aria-label={heading}>
        {items.map((item) => {
          const active = pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={rowClasses(collapsed, active)}
              >
                <item.icon size={18} aria-hidden="true" className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Product navigation. Three states, one component:
 *
 *   desktop expanded  — 288px panel, full lockup and labels
 *   desktop collapsed — 72px icon rail, accessible names via title/aria-label
 *   mobile            — overlay drawer over a scrim, never the rail
 */
function Sidebar({ isOpen, collapsed = false, onClose, onToggleCollapsed }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-ink-deep/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          /* Mobile: a fixed overlay drawer. Desktop: sticky and exactly one
             viewport tall, so the brand row and the footer controls stay put
             while `nav` (flex-1 + overflow-y-auto) is the only scrolling
             region. `lg:static` stretched the panel to the full document
             height, which pushed the collapse toggle below the fold. */
          'fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden border-r border-hair-cloud bg-canvas-light transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0 lg:self-start',
          collapsed ? 'w-72 lg:w-[72px]' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div
          className={cn(
            'flex h-[72px] shrink-0 items-center border-b border-hair-cloud',
            collapsed ? 'justify-center px-2' : 'px-6'
          )}
        >
          {collapsed ? (
            <Link to="/dashboard" aria-label={`${PRODUCT_NAME} home`} title={PRODUCT_NAME}>
              <span className="grid h-10 w-10 place-items-center rounded-md bg-canvas-light p-1">
                <img src="/LT.png" alt="Larsen & Toubro" className="h-full w-full object-contain" />
              </span>
            </Link>
          ) : (
            <Brand to="/dashboard" subtitle="EOL platform" />
          )}
        </div>

        <nav
          className={cn('flex flex-1 flex-col gap-6 overflow-y-auto p-4', collapsed && 'px-2')}
          aria-label="Main"
        >
          <NavGroup
            heading="Workspace"
            items={MAIN}
            pathname={pathname}
            collapsed={collapsed}
            divider={false}
            onNavigate={onClose}
          />
          <NavGroup
            heading="Account"
            items={ACCOUNT}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onClose}
          />
        </nav>

        <div className={cn('flex shrink-0 flex-col gap-1 border-t border-hair-cloud p-4', collapsed && 'px-2')}>
          <button
            type="button"
            onClick={() => signOut(navigate)}
            title={collapsed ? 'Sign out' : undefined}
            aria-label={collapsed ? 'Sign out' : undefined}
            className={rowClasses(collapsed, false)}
          >
            <LogOut size={18} aria-hidden="true" className="shrink-0" />
            {!collapsed && <span className="truncate">Sign out</span>}
          </button>

          {/* Desktop-only: on mobile the drawer is dismissed from the header
              hamburger or the scrim, and the rail state does not exist. */}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(rowClasses(collapsed, false), 'hidden lg:flex')}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" className="shrink-0" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" className="shrink-0" />
            )}
            {!collapsed && <span className="truncate">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
