import React, { memo } from 'react';
import { FileSpreadsheet, Layers, Search, Zap } from 'lucide-react';
import { Eyebrow, Reveal } from '../../components/ui';

const STEPS = [
  {
    n: '01',
    icon: Search,
    title: 'Look up the part',
    body: 'Enter the end-of-life part number, optionally with its manufacturer, and pull the live specification set.',
  },
  {
    n: '02',
    icon: Layers,
    title: 'Set priorities',
    body: 'Mark each parameter P1 must-match, P2 can-differ or P3 cosmetic. This is the judgement the engine encodes.',
  },
  {
    n: '03',
    icon: Zap,
    title: 'Find alternatives',
    body: 'Cross-references come back from the distributor mesh and are scored against your priority map.',
  },
  {
    n: '04',
    icon: FileSpreadsheet,
    title: 'Export the workbook',
    body: 'Download a colour-coded Excel comparison, ready for procurement and design review sign-off.',
  },
];

export default memo(function Workflow() {
  return (
    <section id="workflow" className="border-y border-hair-violet bg-night py-24">
      <div className="shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow polarity="dark">Workflow</Eyebrow>
          <h2 className="mt-3 font-display text-display-large text-on-primary">Four steps to a defensible swap</h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-on-dark-muted">
            The same path every time, whether you are clearing one obsolete regulator or a whole bill of materials.
          </p>
        </Reveal>

        <ol className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-xxl border border-hair-violet p-8">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-md bg-on-dark-faint text-on-primary">
                    <step.icon size={22} aria-hidden="true" />
                  </span>
                  <span className="font-display text-heading-lg text-on-dark-faint">{step.n}</span>
                </div>
                <h3 className="mt-6 font-display text-heading-sm text-on-primary">{step.title}</h3>
                <p className="mt-3 text-body-lg text-on-dark-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
});
