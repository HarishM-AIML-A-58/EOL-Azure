import React from 'react';
import { Link } from 'react-router-dom';
import { Database, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { Brand, Chip, GitHubButton, Starfield } from './ui';
import { ORG_NAME } from '../constants';

const PILLARS = [
  {
    icon: Database,
    title: 'Three distributor APIs, one answer',
    body: 'Octopart, Digi-Key and Mouser are queried in parallel and merged before anything reaches you.',
  },
  {
    icon: ShieldCheck,
    title: 'Priority-aware scoring',
    body: 'Every parameter is weighted by your own Form, Fit and Function judgement — not by string equality.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Audit-ready workbooks',
    body: 'Colour-coded Excel exports that a procurement reviewer can sign off without a walkthrough.',
  },
];

/**
 * Dark-canvas chrome shared by sign-in and registration.
 *
 * Two panels, one polarity: the left column carries the corporate story, the
 * right column carries the form on a `surface-night` panel. Below `lg` the
 * story panel drops out entirely — on a phone the form is the whole job.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="on-dark surface-dark relative min-h-screen overflow-hidden">
      <Starfield />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1280px] grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ── Story panel ─────────────────────────────────────────────── */}
        <section className="hidden flex-col justify-between p-12 lg:flex">
          <Brand polarity="dark" size="lg" subtitle={ORG_NAME} />

          <div className="max-w-md">
            <h2 className="font-display text-display-large text-on-primary">
              Ship past <Chip>obsolescence</Chip>
            </h2>
            <ul className="mt-10 flex flex-col gap-7">
              {PILLARS.map((pillar) => (
                <li key={pillar.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-on-dark-faint text-on-primary">
                    <pillar.icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-body-md text-on-primary">{pillar.title}</p>
                    <p className="mt-1 text-caption text-on-dark-muted">{pillar.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-caption text-on-dark-muted">
            &copy; {new Date().getFullYear()} {ORG_NAME}. Internal engineering platform.
          </p>
        </section>

        {/* ── Form panel ──────────────────────────────────────────────── */}
        <section className="flex flex-col">
          <header className="flex h-[88px] items-center justify-between gap-4 px-6 lg:justify-end lg:px-12">
            <Brand polarity="dark" className="lg:hidden" />
            <GitHubButton polarity="dark" />
          </header>

          <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-12">
            <div className="w-full max-w-[420px]">
              <h1 className="font-display text-heading-xl text-on-primary">{title}</h1>
              {subtitle && <p className="mt-2 text-caption text-on-dark-muted">{subtitle}</p>}

              <div className="mt-8 rounded-xxl border border-hair-violet bg-night p-8">{children}</div>

              {footer && <div className="mt-6">{footer}</div>}

              <p className="mt-8 text-caption text-on-dark-muted">
                Trouble signing in?{' '}
                <Link to="/" className="link-on-dark">
                  Back to the overview
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
