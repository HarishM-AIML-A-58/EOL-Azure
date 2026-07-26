import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Brand, Button, Chip, GitHubButton, Starfield, Sticker } from '../components/ui';

/* 404 stays on the dark canvas — it is a marketing-side surface, not a
   product screen, so it commits to that polarity like every other one. */
export default function NotFound() {
  return (
    <div className="on-dark surface-dark relative min-h-screen overflow-hidden">
      <Starfield />

      <header className="relative z-10">
        <div className="shell flex h-[72px] items-center justify-between gap-4">
          <Brand polarity="dark" />
          <GitHubButton polarity="dark" />
        </div>
      </header>

      <Sticker name="cone" size={112} tilt={-9} className="absolute left-10 bottom-20 hidden opacity-90 lg:block" />

      <main className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-16">
        <div className="max-w-xl text-center">
          <p className="micro-cap text-on-dark-muted">Error 404</p>
          <h1 className="mt-4 font-display text-display-large text-on-primary">
            This page is <Chip>obsolete</Chip>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-body-lg text-on-dark-muted">
            No cross-reference available. The address you followed does not match anything in the platform.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button to="/" variant="inverted" icon={ArrowLeft}>
              Back to the overview
            </Button>
            <Button to="/dashboard" variant="ghostDark">
              Go to the dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
