import React, { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, GitHubButton, Starfield, Sticker } from '../../components/ui';

export default memo(function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-hair-violet bg-night py-24">
      <Starfield />
      <Sticker name="sheet" size={112} tilt={11} className="absolute -right-6 bottom-8 hidden opacity-90 xl:block" />

      <div className="shell relative z-10 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-display-large text-on-primary">
          Stop finding out at the line
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-body-lg text-on-dark-muted">
          Bring your obsolete part numbers. Leave with a workbook that says exactly which alternative holds, which
          one drifts, and which one you cannot use.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button to="/login" variant="inverted" glow iconRight={ArrowRight}>
            Start an analysis
          </Button>
          <GitHubButton polarity="dark" compact={false} />
        </div>
      </div>
    </section>
  );
});
