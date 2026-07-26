import React, { memo } from 'react';
import { Check, Minus } from 'lucide-react';
import { Card, Eyebrow, Reveal } from '../../components/ui';

/*
 * Light-canvas band. Per DESIGN-sentry.md the two canvases own different jobs:
 * dark carries the marketing story, light carries dense reference content that
 * people scan and compare. This is the reference table — so it commits fully
 * to the light world, chrome and all.
 */

const SOURCES = [
  {
    name: 'Octopart',
    featured: true,
    role: 'Specification source of record',
    body: 'Canonical parameter sets and lifecycle status. Results are cached for 30 days so repeat lookups do not burn quota.',
  },
  {
    name: 'Digi-Key',
    role: 'Cross-reference & pricing',
    body: 'Manufacturer-declared substitutes plus live stock and price breaks for every candidate returned.',
  },
  {
    name: 'Mouser',
    role: 'Availability corroboration',
    body: 'A second commercial read on the same candidates, so a single distributor outage never blocks a decision.',
  },
];

const MATRIX = [
  { capability: 'Parameter-level specifications', octopart: true, digikey: true, mouser: false },
  { capability: 'Declared cross-references', octopart: true, digikey: true, mouser: true },
  { capability: 'Real-time stock and pricing', octopart: false, digikey: true, mouser: true },
  { capability: 'Lifecycle / EOL status', octopart: true, digikey: true, mouser: false },
  { capability: 'Response cached by the engine', octopart: true, digikey: false, mouser: false },
];

const Mark = ({ on }) =>
  on ? (
    <Check size={18} className="mx-auto text-violet-deep" aria-label="Supported" />
  ) : (
    <Minus size={18} className="mx-auto text-hair-cool" aria-label="Not supported" />
  );

export default memo(function Coverage() {
  return (
    <section id="coverage" className="surface-light py-24">
      <div className="shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Data coverage</Eyebrow>
          <h2 className="mt-3 font-display text-heading-xl text-ink-deep">
            Three distributor APIs, one merged answer
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-md text-ink-muted">
            Each source is queried for what it is actually good at, then merged into a single candidate set before
            anything reaches the comparison workbook.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((source, i) => (
            <Reveal key={source.name} delay={i * 0.06}>
              <Card tone={source.featured ? 'featured' : 'light'} className="flex h-full flex-col p-8">
                <span className={`micro-cap ${source.featured ? 'text-on-dark-muted' : 'text-ink-faint'}`}>
                  {source.role}
                </span>
                <h3 className={`mt-2 font-display text-heading-md ${source.featured ? 'text-on-primary' : 'text-ink-deep'}`}>
                  {source.name}
                </h3>
                <p className={`mt-4 text-body-md ${source.featured ? 'text-on-dark-muted' : 'text-ink-muted'}`}>
                  {source.body}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-10">
          <div className="overflow-x-auto rounded-xl border border-hair-cloud">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hair-cloud">
                  <th scope="col" className="px-6 py-4 micro-cap text-ink-faint">Capability</th>
                  {SOURCES.map((s) => (
                    <th key={s.name} scope="col" className="px-6 py-4 text-center micro-cap text-ink-faint">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.capability} className="border-b border-hair-cloud last:border-b-0">
                    <th scope="row" className="px-6 py-4 text-left text-body-md font-medium text-ink-deep">
                      {row.capability}
                    </th>
                    <td className="px-6 py-4"><Mark on={row.octopart} /></td>
                    <td className="px-6 py-4"><Mark on={row.digikey} /></td>
                    <td className="px-6 py-4"><Mark on={row.mouser} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
});
