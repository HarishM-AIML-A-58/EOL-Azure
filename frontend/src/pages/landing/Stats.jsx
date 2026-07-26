import React, { memo } from 'react';
import { CountUp, Eyebrow, Reveal } from '../../components/ui';

const STATS = [
  { value: 3, suffix: '', label: 'Distributor APIs merged per query' },
  { value: 3, suffix: '', label: 'Priority tiers driving the score' },
  { value: 30, suffix: ' days', label: 'Specification cache window' },
  { value: 1, suffix: ' file', label: 'Colour-coded workbook per analysis' },
];

export default memo(function Stats() {
  return (
    <section id="impact" className="relative overflow-hidden py-24">
      <div className="shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow polarity="dark">By the numbers</Eyebrow>
          <h2 className="mt-3 font-display text-display-large text-on-primary">How the engine is wired</h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-on-dark-muted">
            No vanity metrics — these are the constants the pipeline actually runs on.
          </p>
        </Reveal>

        <dl className="mt-16 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08}>
              <div className="h-full rounded-xxl border border-hair-violet p-8 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <p className="font-display text-display-large text-on-primary">
                    <CountUp to={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-3 text-body-md text-on-dark-muted">{stat.label}</p>
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
});
