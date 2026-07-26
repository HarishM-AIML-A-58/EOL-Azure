/**
 * Sentry design-language primitives.
 *
 * Every export here maps to a named component in DESIGN-sentry.md. The rule the
 * whole kit follows: a surface commits to one canvas polarity — dark
 * (marketing, auth) or light (product) — and the chrome flips with it. Nothing
 * blends the two.
 */
import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GITHUB_URL, PRODUCT_NAME } from '../../constants';
import { Sparkline } from '../charts';

/* ══════════════════════════════════════════════════════════════════════════
   Button — single-primary CTA hierarchy, polarity-flipped
   ══════════════════════════════════════════════════════════════════════════ */

const VARIANTS = {
  primary: 'btn-primary',
  inverted: 'btn-inverted',
  ghost: 'btn-ghost',
  ghostDark: 'btn-ghost-dark',
  violetToken: 'btn-violet-token',
};

export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size, glow, loading, icon: Icon, iconRight: IconRight, className, children, disabled, ...rest },
  ref
) {
  const Component = as || (to ? Link : href ? 'a' : 'button');
  const classes = cn(
    'btn',
    VARIANTS[variant] || VARIANTS.primary,
    size === 'sm' && 'btn-sm',
    size === 'icon' && 'btn-icon',
    glow && 'btn-glow',
    className
  );

  const extra = {};
  if (Component === 'button') extra.type = rest.type || 'button';
  if (Component === 'a') {
    extra.href = href;
    if (rest.target === '_blank') extra.rel = rest.rel || 'noreferrer noopener';
  }
  if (Component === Link) extra.to = to;
  if (disabled) extra['aria-disabled'] = true;

  return (
    <Component
      ref={ref}
      className={classes}
      disabled={Component === 'button' ? disabled || loading : undefined}
      {...extra}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={16} aria-hidden="true" /> : null}
    </Component>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   View on GitHub — the top-right affordance on every surface
   ══════════════════════════════════════════════════════════════════════════ */

export function GitHubMark({ className, size = 16 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * @param {'dark'|'light'} polarity  Canvas the button sits on.
 * @param {boolean} compact          Icon-only below the `sm` breakpoint.
 */
export function GitHubButton({ polarity = 'light', compact = true, className }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer noopener"
      title="View the source on GitHub"
      className={cn(
        'btn',
        polarity === 'dark' ? 'btn-ghost-dark' : 'btn-ghost',
        'btn-sm gap-2',
        className
      )}
    >
      <GitHubMark />
      <span className={compact ? 'hidden sm:inline' : undefined}>View on GitHub</span>
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Brand lockup
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The corporate lockup: the L&T roundel on a white tile, then the product
 * wordmark. The mark is navy on transparent, so it needs the white tile to
 * survive the dark canvas — which is also how L&T presents it officially.
 */
export function Brand({ polarity = 'light', to = '/', subtitle, size = 'md', className }) {
  const dark = polarity === 'dark';
  const tile = size === 'lg' ? 'h-12 w-12 p-1.5' : 'h-10 w-10 p-1';
  const word = size === 'lg' ? 'text-heading-md' : 'text-[18px]';

  const content = (
    <>
      <span className={cn('grid shrink-0 place-items-center rounded-md bg-canvas-light', tile)}>
        <img src="/LT.png" alt="Larsen & Toubro" className="h-full w-full object-contain" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            'font-display font-bold tracking-tight',
            word,
            dark ? 'text-on-primary' : 'text-ink-deep'
          )}
        >
          {PRODUCT_NAME}
        </span>
        <span className={cn('micro-cap mt-1 truncate', dark ? 'text-on-dark-muted' : 'text-ink-faint')}>
          {subtitle || 'Technology Services'}
        </span>
      </span>
    </>
  );

  if (!to) {
    return <div className={cn('flex shrink-0 items-center gap-3', className)}>{content}</div>;
  }
  return (
    <Link to={to} className={cn('flex shrink-0 items-center gap-3', className)}>
      {content}
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Typographic devices
   ══════════════════════════════════════════════════════════════════════════ */

/** The signature lime keyword highlight. One per viewport — that's the deal. */
export function Chip({ children }) {
  return <span className="chip-lime">{children}</span>;
}

export function Eyebrow({ children, polarity = 'light', className }) {
  return (
    <span className={cn('eyebrow', polarity === 'dark' ? 'text-lime' : 'text-violet-mid', className)}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Cards & badges
   ══════════════════════════════════════════════════════════════════════════ */

export function Card({ tone = 'light', className, children, ...rest }) {
  const tones = {
    light: 'card-light',
    featured: 'card-featured',
    dark: 'card-dark',
    spotlight: 'card-spotlight',
  };
  return (
    <div className={cn(tones[tone], className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * Card header for product surfaces: icon, title, description, trailing slot.
 */
export function CardHead({ icon: Icon, title, description, trailing, className }) {
  return (
    <div className={cn('flex items-start gap-4 border-b border-hair-cloud p-6', className)}>
      {Icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-press-light text-ink-deep">
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-heading-sm text-ink-deep">{title}</h2>
        {description && <p className="mt-1 text-caption text-ink-muted">{description}</p>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-3">{trailing}</div>}
    </div>
  );
}

const BADGE_TONES = {
  dark: 'pill-dark',
  light: 'pill-light',
  lime: 'bg-lime text-ink-deep',
  pink: 'bg-pink text-ink-deep',
  violet: 'bg-violet-mid text-on-primary',
  outline: 'border border-hair-cloud text-ink-muted',
};

export function Badge({ tone = 'light', className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs px-2 py-1 text-caption',
        BADGE_TONES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Small all-caps status label — `micro-cap` type token. */
export function StatusLabel({ children, className }) {
  return <span className={cn('micro-cap', className)}>{children}</span>;
}

/* ══════════════════════════════════════════════════════════════════════════
   Forms
   ══════════════════════════════════════════════════════════════════════════ */

export function Field({ id, label, hint, required, optional, error, children, className }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-1 text-pink">*</span>}
          {optional && <span className="ml-2 font-normal normal-case tracking-normal opacity-70">(optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-caption text-pink">{error}</p>
      ) : hint ? (
        <p className="text-caption text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Text input with optional leading icon and trailing slot.
 *
 * The wrapper owns the full width and the input fills it, so a trailing
 * control (a password reveal, a unit suffix) overlays the field instead of
 * competing with it for horizontal space.
 */
export const TextInput = forwardRef(function TextInput(
  { polarity = 'light', icon: Icon, trailing, className, wrapperClassName, ...rest },
  ref
) {
  const dark = polarity === 'dark';
  const input = (
    <input
      ref={ref}
      className={cn(
        'field-input',
        dark && 'field-input-dark',
        Icon && 'pl-11',
        trailing && 'pr-12',
        className
      )}
      {...rest}
    />
  );

  if (!Icon && !trailing) return input;

  return (
    <div className={cn('relative block w-full', wrapperClassName)}>
      {Icon && (
        <Icon
          size={18}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2',
            dark ? 'text-on-dark-muted' : 'text-ink-faint'
          )}
        />
      )}
      {input}
      {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
});

/** Text input with a built-in reveal toggle. */
export const PasswordInput = forwardRef(function PasswordInput({ polarity = 'light', ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  const dark = polarity === 'dark';
  return (
    <TextInput
      ref={ref}
      polarity={polarity}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-xs transition-colors',
            dark ? 'text-on-dark-muted hover:text-on-primary' : 'text-ink-faint hover:text-ink-deep'
          )}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
      {...rest}
    />
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Page scaffolding — product surfaces
   ══════════════════════════════════════════════════════════════════════════ */

export function PageHeader({ breadcrumb, title, description, actions }) {
  return (
    <header className="flex flex-col gap-4 border-b border-hair-cloud pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 micro-cap text-ink-faint">
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={crumb}>
                {i > 0 && <span aria-hidden="true">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-violet-mid' : undefined}>{crumb}</span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="font-display text-heading-xl text-ink-deep">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-caption text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/**
 * Horizontal progress stepper for a multi-stage workspace. States are
 * `done`, `active`, `todo` — the filled step is the primary near-black, so
 * the single-primary hierarchy still reads at a glance.
 */
export function Stepper({ steps, className }) {
  return (
    <ol className={cn('flex flex-col gap-4 md:flex-row md:items-center md:gap-2', className)}>
      {steps.map((step, i) => {
        const done = step.state === 'done';
        const active = step.state === 'active';
        return (
          <React.Fragment key={step.label}>
            <li className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold',
                  done && 'bg-primary text-on-primary',
                  active && 'bg-lime text-ink-deep',
                  !done && !active && 'border border-hair-cloud bg-canvas-light text-ink-faint'
                )}
              >
                {done ? <Check size={15} aria-hidden="true" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-[14px] font-medium leading-tight',
                    done || active ? 'text-ink-deep' : 'text-ink-faint'
                  )}
                >
                  {step.label}
                </span>
                {step.hint && <span className="mt-0.5 block truncate micro-cap text-ink-faint">{step.hint}</span>}
              </span>
            </li>
            {/* Fixed-width connector: it must never compete with the label
                for horizontal space, which is what truncated them before. */}
            {i < steps.length - 1 && (
              <li aria-hidden="true" className="hidden h-px w-6 shrink-0 bg-hair-cloud md:block" />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/**
 * Headline metric tile for dashboards and summary rails.
 *
 * Follows the stat-tile contract: label, value, an optional signed delta against
 * a named period, and an optional trend sparkline. `delta` is `{ value, label }`
 * where a positive value means "more than last period" — direction is coloured
 * by whether up is good, which `deltaGood` decides (default: up is good).
 *
 * Values keep the display face because that is this system's treatment for
 * numbers across the product; the dashboard leads with no separate hero figure,
 * so nothing here competes for that role.
 */
export function KpiTile({ icon: Icon, label, value, sub, tone = 'light', delta, deltaGood = true, trend }) {
  const dark = tone === 'dark';
  const hasDelta = delta && Number.isFinite(delta.value) && delta.value !== 0;
  const up = hasDelta && delta.value > 0;
  const favourable = hasDelta && (up === deltaGood);

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border p-5',
        dark ? 'border-hair-violet bg-night' : 'border-hair-cloud bg-canvas-light'
      )}
    >
      {Icon && (
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-md',
            dark ? 'bg-on-dark-faint text-on-primary' : 'bg-press-light text-ink-deep'
          )}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('micro-cap', dark ? 'text-on-dark-muted' : 'text-ink-faint')}>{label}</p>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className={cn('font-display text-heading-md', dark ? 'text-on-primary' : 'text-ink-deep')}>{value}</p>
          {hasDelta && (
            <span
              className={cn(
                'text-caption font-semibold tabular-nums',
                favourable ? 'text-violet-deep' : 'text-pink'
              )}
            >
              {up ? '+' : '−'}
              {Math.abs(delta.value)}
              <span className="ml-1 font-normal text-ink-faint">{delta.label}</span>
            </span>
          )}
        </div>
        {sub && <p className={cn('text-caption', dark ? 'text-on-dark-muted' : 'text-ink-muted')}>{sub}</p>}
      </div>
      {trend && trend.length > 1 && (
        <div className="shrink-0 self-end pb-1">
          <Sparkline values={trend} />
        </div>
      )}
    </div>
  );
}

/** Section bar inside a card: title on the left, controls on the right. */
export function Toolbar({ title, icon: Icon, meta, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4 border-b border-hair-cloud p-5', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {Icon && <Icon size={18} aria-hidden="true" className="shrink-0 text-violet-mid" />}
        {/* Wraps rather than truncates: a section title that reads
            "Look up part specifi…" on a phone is worse than two lines. */}
        <h2 className="font-display text-heading-sm text-ink-deep">{title}</h2>
        {meta}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * Data grid. One table treatment across every product surface: hairline-cloud
 * dividers, micro-cap headers, no zebra striping.
 *
 * Layout is `table-fixed`, which is what stops the last column being pushed
 * out of view. Give every column a `width` except the one flexible column —
 * fixed layout then honours those widths instead of letting a long cell
 * (a 200-character specification string) size the table. Long content in the
 * flexible column must clip or wrap on its own; see `col.clamp`.
 *
 * Columns:
 *   key      unique id
 *   header   column heading
 *   render   (row, index) => node
 *   width    CSS width — set on all but one column
 *   align    'right' to right-align
 *   clamp    true to truncate overflowing content to a single line
 */
export function DataGrid({ columns, rows, getRowKey, caption, minWidth, empty }) {
  if (!rows.length && empty) return empty;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left" style={minWidth ? { minWidth } : undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-hair-cloud">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('px-5 py-3 micro-cap text-ink-faint', col.align === 'right' && 'text-right')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={getRowKey ? getRowKey(row, i) : i} className="border-b border-hair-cloud last:border-b-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-5 py-4 align-middle',
                    col.align === 'right' && 'text-right',
                    col.clamp && 'truncate'
                  )}
                >
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {Icon && <Icon size={28} className="text-hair-cool" aria-hidden="true" />}
      <p className="font-display text-heading-sm text-ink-deep">{title}</p>
      {description && <p className="max-w-sm text-caption text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Signature decoration — starfield, squiggle, stickers
   ══════════════════════════════════════════════════════════════════════════ */

/** Faint white-on-violet pinpricks. Sits inside a `relative` dark section. */
export function Starfield({ className }) {
  return <div aria-hidden="true" className={cn('starfield pointer-events-none absolute inset-0', className)} />;
}

/**
 * Lime squiggly divider — the hand-drawn flourish that replaces the 1px
 * hairline above the footer.
 */
export function Squiggle({ className }) {
  return (
    <svg
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('block h-6 w-full', className)}
    >
      <path
        d="M0 12c25-11 50-11 75 0s50 11 75 0 50-11 75 0 50 11 75 0 50-11 75 0 50 11 75 0 50-11 75 0 50 11 75 0 50-11 75 0 50 11 75 0 50-11 75 0 50 11 75 0 50-11 75 0 50 11 75 0"
        fill="none"
        stroke="var(--color-lime)"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Sticker mascots. Hand-drawn outlines, saturated lime/pink fills, no
 * container and no shadow — they break the grid, they don't sit inside it.
 */
const STICKERS = {
  /* A chip with a face — the component under inspection. */
  chip: (
    <>
      <rect x="18" y="18" width="60" height="60" rx="8" fill="var(--color-lime)" />
      <path d="M30 6v12M48 6v12M66 6v12M30 78v12M48 78v12M66 78v12M6 30h12M6 48h12M6 66h12M78 30h12M78 48h12M78 66h12" />
      <rect x="18" y="18" width="60" height="60" rx="8" fill="none" />
      <circle cx="38" cy="42" r="4" fill="var(--color-ink-deep)" stroke="none" />
      <circle cx="58" cy="42" r="4" fill="var(--color-ink-deep)" stroke="none" />
      <path d="M36 58c4 5 20 5 24 0" />
    </>
  ),
  /* Traffic cone — the obsolescence warning. */
  cone: (
    <>
      <path d="M48 10 74 76H22L48 10Z" fill="var(--color-pink)" />
      <path d="M32 52h32M27 64h42" />
      <rect x="14" y="76" width="68" height="12" rx="6" fill="var(--color-pink)" />
    </>
  ),
  /* Magnifier — the lookup. */
  glass: (
    <>
      <circle cx="42" cy="42" r="26" fill="var(--color-lime)" />
      <path d="M61 61 84 84" strokeWidth="7" strokeLinecap="round" />
      <path d="M32 38c2-7 8-10 14-9" />
    </>
  ),
  /* Stacked sheets — the exported workbook. */
  sheet: (
    <>
      <rect x="16" y="12" width="52" height="66" rx="6" fill="var(--color-on-primary)" />
      <rect x="30" y="24" width="52" height="66" rx="6" fill="var(--color-lime)" />
      <path d="M40 44h32M40 56h32M40 68h20" />
    </>
  ),
};

export function Sticker({ name = 'chip', size = 96, tilt = 0, className, style }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn('animate-drift', className)}
      style={{ '--tilt': `${tilt}deg`, transform: `rotate(${tilt}deg)`, ...style }}
      stroke="var(--color-ink-deep)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {STICKERS[name] || STICKERS.chip}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Reveal — scroll-in for section content, IntersectionObserver only
   ══════════════════════════════════════════════════════════════════════════ */

export function Reveal({ delay = 0, as: Tag = 'div', className, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '-40px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(24px)',
        transition: `opacity .6s cubic-bezier(.22,1,.36,1) ${delay}s, transform .6s cubic-bezier(.22,1,.36,1) ${delay}s`,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Counts up to `to` the first time it scrolls into view. */
export function CountUp({ to, suffix = '', duration = 1400 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const run = () => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setValue(to);
        return;
      }
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / duration, 1);
        setValue(Math.floor((1 - Math.pow(1 - p, 3)) * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        run();
        io.disconnect();
      }
    });
    io.observe(node);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
