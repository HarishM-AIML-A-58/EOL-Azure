import React, { memo } from 'react';
import { BarChart3, Cpu, FileSpreadsheet, Globe, Search, ShieldCheck } from 'lucide-react';
import { Card, Eyebrow, Reveal, Sticker } from '../../components/ui';

const FEATURES = [
  {
    icon: Search,
    title: 'Multi-vendor lookup',
    body: 'One query fans out across Octopart, Digi-Key and Mouser, with automatic fallback when a source has no coverage.',
  },
  {
    icon: Cpu,
    title: 'AI Form/Fit/Function',
    body: 'Azure OpenAI reads both specification sets and classifies every parameter as match, variation, or no-match.',
  },
  {
    icon: BarChart3,
    title: 'Priority mapping',
    body: 'Weight each parameter P1 must-match, P2 can-differ, or P3 cosmetic so scoring reflects your actual design intent.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Colour-coded workbooks',
    body: 'Export an Excel comparison with conditional formatting that a procurement reviewer can read without training.',
  },
  {
    icon: ShieldCheck,
    title: 'Obsolescence guard',
    body: 'Lifecycle status travels with every result, so an end-of-life replacement is never itself close to end-of-life.',
  },
  {
    icon: Globe,
    title: 'Server-held credentials',
    body: 'Distributor and model keys live in the host environment. They are never shipped in the browser bundle or stored client-side.',
  },
];

export default memo(function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-24">
      <Sticker name="chip" size={104} tilt={-8} className="absolute -left-8 top-12 hidden opacity-90 xl:block" />

      <div className="shell relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow polarity="dark">Capabilities</Eyebrow>
          <h2 className="mt-3 font-display text-display-large text-on-primary">
            Everything the replacement decision needs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-on-dark-muted">
            From the first part-number lookup to the workbook that lands in a review meeting, the whole
            end-of-life workflow lives in one place.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.06}>
              <Card tone="dark" className="h-full p-8">
                <span className="grid h-12 w-12 place-items-center rounded-md bg-on-dark-faint text-on-primary">
                  <feature.icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-6 font-display text-heading-md text-on-primary">{feature.title}</h3>
                <p className="mt-3 text-body-lg text-on-dark-muted">{feature.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        {/* Spotlight band — the one capability that is genuinely ours. */}
        <Reveal delay={0.1}>
          <Card tone="spotlight" className="mt-6 grid grid-cols-1 items-center gap-8 p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <Eyebrow polarity="dark" className="text-on-primary">Only in CORe</Eyebrow>
              <h3 className="mt-3 font-display text-heading-lg text-on-primary">
                Priority-aware scoring, not string equality
              </h3>
              <p className="mt-4 max-w-xl text-body-lg text-on-dark-muted">
                A 5&nbsp;% tolerance shift on a decoupling capacitor is noise. The same shift on a reference voltage
                is a redesign. CORe scores each parameter against the priority you set, so the workbook reflects
                engineering judgement rather than a diff.
              </p>
            </div>
            <pre className="code-block text-[14px]">{`POST /api/v1/find_alternatives
{
  "eol_part_number": "LM317T",
  "manufacturer": "Texas Instruments",
  "priority_map": [
    { "parameter": "Vout",     "priority": 1 },
    { "parameter": "Package",  "priority": 2 },
    { "parameter": "Finish",   "priority": 3 }
  ]
}`}</pre>
          </Card>
        </Reveal>
      </div>
    </section>
  );
});
