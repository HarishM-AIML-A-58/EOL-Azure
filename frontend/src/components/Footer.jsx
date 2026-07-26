import React from 'react';
import { Link } from 'react-router-dom';
import { GitHubMark } from './ui';
import { GITHUB_URL, ORG_NAME } from '../constants';

/**
 * Product-surface footer. Deliberately slim: the marketing footer (with the
 * lime squiggle) belongs to the landing page, not to a working screen.
 */
function Footer() {
  return (
    <footer className="border-t border-hair-cloud bg-canvas-light">
      <div className="gutter-x flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
        <p className="text-caption text-ink-muted">
          &copy; {new Date().getFullYear()} {ORG_NAME}
        </p>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <Link to="/" className="text-caption text-ink-muted transition-colors hover:text-ink-deep">
            Overview
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-caption text-ink-muted transition-colors hover:text-ink-deep"
          >
            <GitHubMark />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
