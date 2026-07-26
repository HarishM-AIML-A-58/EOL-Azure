import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Brand, GitHubMark, Squiggle } from '../../components/ui';
import { GITHUB_URL, ORG_NAME } from '../../constants';

/*
 * `footer-light` — the site-wide footer on the light-canvas template, topped
 * by the lime squiggly divider that stands in for a 1px hairline.
 */

const GROUPS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Part analysis', to: '/analysis' },
      { label: 'Reports', to: '/reports' },
      { label: 'History', to: '/history' },
    ],
  },
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'Data coverage', href: '#coverage' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'Settings', to: '/settings' },
    ],
  },
];

export default memo(function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="surface-light">
      <Squiggle />
      <div className="shell py-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Brand />
            <p className="mt-5 max-w-xs text-caption text-ink-muted">
              Component Obsolescence &amp; Resilience Engine — Form, Fit and Function analysis for enterprise
              supply chains.
            </p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="micro-cap text-ink-faint">{group.heading}</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-caption text-ink-muted transition-colors hover:text-ink-deep">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-caption text-ink-muted transition-colors hover:text-ink-deep">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-hair-cloud pt-8 sm:flex-row">
          <p className="text-caption text-ink-muted">
            &copy; {year} {ORG_NAME}. All rights reserved.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-caption text-ink-muted transition-colors hover:text-ink-deep"
          >
            <GitHubMark />
            View source on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
});
