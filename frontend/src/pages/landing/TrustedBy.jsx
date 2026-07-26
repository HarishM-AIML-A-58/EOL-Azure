import React, { memo } from 'react';

/* Customer-logo strip: plain wordmarks, no photography, no containers. */
const UNITS = [
  'Larsen & Toubro',
  'LTTS',
  'Heavy Engineering',
  'Power Transmission',
  'Defence Systems',
  'Precision Manufacturing',
];

export default memo(function TrustedBy() {
  return (
    <section className="border-y border-hair-violet bg-night py-12">
      <div className="shell">
        <p className="text-center micro-cap text-on-dark-muted">
          Relied on by enterprise engineering and procurement teams
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {UNITS.map((unit) => (
            <span key={unit} className="select-none font-display text-heading-sm text-on-dark-muted opacity-70">
              {unit}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
});
