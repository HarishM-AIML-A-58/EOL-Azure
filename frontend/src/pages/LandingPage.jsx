import React, { Suspense, lazy, memo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Brand, Button, Chip, GitHubButton, Starfield, Sticker } from '../components/ui';
import { PRODUCT_TAGLINE } from '../constants';

/* Below-the-fold bands load on demand. */
const TrustedBy = lazy(() => import('./landing/TrustedBy'));
const Features = lazy(() => import('./landing/Features'));
const Workflow = lazy(() => import('./landing/Workflow'));
const Coverage = lazy(() => import('./landing/Coverage'));
const Stats = lazy(() => import('./landing/Stats'));
const CTA = lazy(() => import('./landing/CTA'));
const SiteFooter = lazy(() => import('./landing/SiteFooter'));

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#impact', label: 'Impact' },
];

/* ══════════════════════════════════════════════════════════════════════════
   Top nav — dark variant. Right-side CTA is `button-inverted`.
   ══════════════════════════════════════════════════════════════════════════ */

const Nav = memo(function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-hair-violet bg-canvas-dark/95 backdrop-blur' : 'border-b border-transparent'
      }`}
    >
      <div className="shell flex h-[72px] items-center justify-between gap-6">
        <Brand polarity="dark" />

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-body-md text-on-dark-muted transition-colors hover:text-on-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <GitHubButton polarity="dark" />
          <Link
            to="/login"
            className="hidden text-button-cap uppercase text-on-dark-muted transition-colors hover:text-on-primary sm:inline"
          >
            Sign in
          </Link>
          <Button to="/login" variant="inverted" size="sm" className="hidden sm:inline-flex">
            Get started
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="btn btn-ghost-dark btn-icon lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile accordion — same canvas polarity as the page. */}
      {open && (
        <div className="border-t border-hair-violet bg-canvas-dark lg:hidden">
          <div className="shell flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-body-md text-on-dark-muted hover:bg-on-dark-faint hover:text-on-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-3">
              <Button to="/login" variant="inverted">Get started</Button>
              <Button to="/register" variant="ghostDark">Create account</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Hero — one display headline, one lime keyword chip, one filled CTA
   ══════════════════════════════════════════════════════════════════════════ */

const HERO_TILES = [
  { label: 'Specs loaded', value: '24' },
  { label: 'Alternatives', value: '12' },
  { label: 'P1 match rate', value: '98%' },
];

const HERO_BARS = [40, 65, 45, 85, 55, 70, 50, 90, 60, 75, 55, 80];

const Hero = memo(function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden pt-[136px] pb-24">
      <Starfield />

      {/* Stickers break the section boundary — no container, no shadow. */}
      <Sticker name="cone" size={104} tilt={-12} className="absolute -left-6 top-[190px] hidden opacity-90 xl:block" />
      <Sticker name="glass" size={112} tilt={9} className="absolute -right-4 top-[150px] hidden opacity-90 xl:block" />

      <div className="shell relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="pill-dark border border-hair-violet">
            <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-lime" aria-hidden="true" />
            Enterprise edition · AI-assisted FFF analysis
          </span>

          <h1 className="mt-8 font-display text-display-hero text-on-primary">
            Ship past <Chip>obsolescence</Chip>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-body-lg text-on-dark-muted">
            {PRODUCT_TAGLINE}. Look up end-of-life specifications, weight every parameter by Form, Fit and Function,
            and export a colour-coded workbook your procurement team can act on.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="inverted" glow onClick={() => navigate('/login')} iconRight={ArrowRight}>
              Start an analysis
            </Button>
            <Button variant="ghostDark" onClick={() => navigate('/register')}>
              Create an account
            </Button>
          </div>
        </div>

        {/* Window-chrome UI mock — rounded xxl, tilted off-axis, no border. */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div className="card-dark -rotate-[1.5deg] overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-hair-violet px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-pink" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-violet-mid" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-violet-deep" aria-hidden="true" />
              <span className="ml-auto micro-cap text-on-dark-muted">core / dashboard</span>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
              {HERO_TILES.map((tile) => (
                <div key={tile.label} className="rounded-lg border border-hair-violet bg-night p-4">
                  <span className="micro-cap text-on-dark-muted">{tile.label}</span>
                  <p className="mt-1 font-display text-heading-md text-on-primary">{tile.value}</p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              <div className="flex h-28 items-end gap-1.5 rounded-lg border border-hair-violet bg-night px-4 pb-4">
                {HERO_BARS.map((height, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-xs bg-violet-mid/70"
                    style={{ height: `${height}%` }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

/* ══════════════════════════════════════════════════════════════════════════ */

const BandFallback = () => <div className="h-40" aria-hidden="true" />;

export default function LandingPage() {
  return (
    <div className="on-dark surface-dark min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Suspense fallback={<BandFallback />}>
          <TrustedBy />
          <Features />
          <Workflow />
          <Coverage />
          <Stats />
          <CTA />
        </Suspense>
      </main>
      <Suspense fallback={<BandFallback />}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
