/**
 * Chart primitives.
 *
 * Plain SVG on the Sentry tokens — no charting dependency. The product ships one
 * 77KB app chunk and a chart library would be a third of that again for nine
 * small figures.
 *
 * The colour decisions here are validated, not eyeballed:
 *
 *   CATEGORICAL (two series, identity)  #6a5fc1 violet · #fa7faa pink
 *     worst adjacent ΔE 18.0 protanopia / 27.3 normal vision — clears the 8 and
 *     15 floors comfortably. Pink sits at 2.42:1 on white, under the 3:1 mark
 *     for fills, which obligates a relief channel: every chart that uses it
 *     carries direct labels and a table view. Both ship.
 *
 *   SEQUENTIAL (magnitude, the heatmap)  #b8abe6 → #8f7fd1 → #6a5fc1 → #4a3499
 *     monotone lightness, every adjacent ΔL ≥ 0.06, single hue (9° spread),
 *     light end 2.10:1 on white. A day with no activity is not a step on this
 *     ramp — it is a near-surface tint with a hairline, so an empty cell still
 *     reads as a cell.
 *
 * Rules the marks follow throughout: bars capped at 24px with a 4px rounded
 * data-end and a square baseline, 2px lines with round joins, markers ≥ 8px
 * carrying a 2px surface ring, area fills at 10% opacity, hairline solid
 * gridlines one step off the surface, a 2px surface gap between touching bars,
 * and text in ink tokens — never in a series colour.
 */
import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';

/* ── Tokens ─────────────────────────────────────────────────────────────── */

export const SERIES = {
  primary: '#6a5fc1',   // --color-violet
  accent: '#fa7faa',    // --color-pink
};

export const HEAT_RAMP = ['#b8abe6', '#8f7fd1', '#6a5fc1', '#4a3499'];
export const HEAT_EMPTY = '#f4f3f8';

const GRID = '#e5e7eb';       // --color-hair-cloud
const SURFACE = '#ffffff';

const fmt = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/** Clean axis ceiling: 1/2/5 × 10ⁿ at or above the peak. */
function niceMax(value) {
  if (value <= 4) return Math.max(1, value);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

/* ── Tooltip ────────────────────────────────────────────────────────────── */

/**
 * Floating readout. Value leads and the label follows — the reader already has
 * the series and wants the number. Series are keyed with a short stroke rather
 * than a filled box; at this density a box is data-weight ink doing a label's
 * job. All text goes in through React children, so untrusted category names are
 * escaped by construction.
 */
function Tooltip({ x, y, title, rows, align = 'left' }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-[8.5rem] rounded-md border border-hair-cloud bg-canvas-light px-3 py-2 shadow-e2"
      style={{
        left: x,
        top: y,
        transform: `translate(${align === 'right' ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <p className="micro-cap text-ink-faint">{title}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 whitespace-nowrap">
            {row.color && (
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-3 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
            )}
            <span className="text-[14px] font-semibold text-ink-deep">{row.value}</span>
            <span className="text-caption text-ink-muted">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Legend ─────────────────────────────────────────────────────────────── */

/** Always rendered for two or more series; a single series is named by the title. */
export function Legend({ items, className }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-4', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn('inline-block shrink-0', item.shape === 'line' ? 'h-0.5 w-4 rounded-full' : 'h-2.5 w-2.5 rounded-xs')}
            style={{ background: item.color }}
          />
          <span className="text-caption text-ink-muted">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Table twin ─────────────────────────────────────────────────────────── */

/**
 * The WCAG-clean equivalent of a figure. Every chart here has one, which is
 * also what discharges the sub-3:1 fill warning on the accent hue.
 */
export function ChartTable({ columns, rows, caption }) {
  return (
    <div className="max-h-64 overflow-auto border-t border-hair-cloud">
      <table className="w-full border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 bg-canvas-light">
          <tr className="border-b border-hair-cloud">
            {columns.map((col, i) => (
              <th
                key={col}
                scope="col"
                className={cn('px-5 py-2 micro-cap text-ink-faint', i > 0 && 'text-right')}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-b border-hair-cloud last:border-b-0">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={cn(
                    'px-5 py-2 text-caption',
                    i === 0 ? 'text-ink-deep' : 'text-right tabular-nums text-ink-muted'
                  )}
                >
                  {typeof cell === 'number' ? fmt.format(cell) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Sparkline ──────────────────────────────────────────────────────────── */

/**
 * Stat-tile trend. Decorative support for the number beside it, so it carries
 * no axes and no hover — the value and its delta are the readable content.
 */
export function Sparkline({ values, color = SERIES.primary, width = 96, height = 28 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const y = (v) => height - 2 - (v / max) * (height - 4);
  const points = values.map((v, i) => `${i * step},${y(v)}`);
  const last = values[values.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx={width} cy={y(last)} r="3.5" fill={color} stroke={SURFACE} strokeWidth="2" />
    </svg>
  );
}

/* ── Time series ────────────────────────────────────────────────────────── */

/**
 * Lookups and exports over time. Both series are counts, so they share one
 * axis — a second y-scale would invent a correlation the data does not contain.
 *
 * A crosshair snaps to the nearest x and the readout lists every series there,
 * so the pointer never has to land on a 2px stroke. Arrow keys move the same
 * cursor, and focus shows what hover shows.
 */
export function TimeSeries({ labels, series, height = 240, valueLabel = 'lookups' }) {
  const [cursor, setCursor] = useState(null);
  const wrapRef = useRef(null);
  const clipId = useId().replace(/:/g, '');

  const pad = { top: 12, right: 16, bottom: 26, left: 34 };
  const [box, setBox] = useState({ w: 640 });
  const w = box.w;
  const plotW = Math.max(10, w - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const measure = useCallback((node) => {
    if (!node) return;
    wrapRef.current = node;
    const set = () => setBox({ w: node.clientWidth || 640 });
    set();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(set);
      ro.observe(node);
    }
  }, []);

  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const xAt = (i) => (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v) => plotH - (v / max) * plotH;

  const ticks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => Math.round((max / count) * i));
  }, [max]);

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = event.clientX - rect.left - pad.left;
    const i = Math.max(0, Math.min(n - 1, Math.round((rel / plotW) * (n - 1))));
    setCursor(i);
  };

  const onKey = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setCursor((prev) => {
        const base = prev == null ? n - 1 : prev;
        return Math.max(0, Math.min(n - 1, base + (event.key === 'ArrowRight' ? 1 : -1)));
      });
    } else if (event.key === 'Escape') {
      setCursor(null);
    }
  };

  return (
    <div className="relative" ref={measure}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        tabIndex={0}
        aria-label={`${series.map((s) => s.label).join(' and ')} over ${n} days. Use arrow keys to read individual days.`}
        onPointerMove={onMove}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={onKey}
        onFocus={() => setCursor((prev) => (prev == null ? n - 1 : prev))}
        onBlur={() => setCursor(null)}
        className="touch-none rounded-md focus-visible:outline-none"
      >
        <defs>
          <clipPath id={`clip-${clipId}`}>
            <rect x="0" y="0" width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <g transform={`translate(${pad.left},${pad.top})`}>
          {/* Hairline grid, solid and one step off the surface. */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1="0" x2={plotW} y1={yAt(tick)} y2={yAt(tick)} stroke={GRID} strokeWidth="1" />
              <text x="-8" y={yAt(tick)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[10px] tabular-nums">
                {tick}
              </text>
            </g>
          ))}

          <g clipPath={`url(#clip-${clipId})`}>
            {series.map((s) => {
              const line = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
              if (s.shape === 'line') {
                return (
                  <polyline
                    key={s.key}
                    points={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              return (
                <g key={s.key}>
                  {/* Area wash at 10% — never a saturated block. */}
                  <polygon
                    points={`${xAt(0)},${plotH} ${line} ${xAt(n - 1)},${plotH}`}
                    fill={s.color}
                    opacity="0.1"
                  />
                  <polyline
                    points={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Baseline */}
          <line x1="0" x2={plotW} y1={plotH} y2={plotH} stroke={GRID} strokeWidth="1" />

          {/* X labels: first, middle and last only — a tick per day collides. */}
          {[0, Math.floor((n - 1) / 2), n - 1].filter((i, idx, arr) => arr.indexOf(i) === idx).map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={plotH + 16}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-ink-faint text-[10px]"
            >
              {labels[i]}
            </text>
          ))}

          {cursor != null && (
            <g>
              <line x1={xAt(cursor)} x2={xAt(cursor)} y1="0" y2={plotH} stroke={SERIES.primary} strokeWidth="1" opacity="0.5" />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={xAt(cursor)}
                  cy={yAt(s.values[cursor])}
                  r="4.5"
                  fill={s.color}
                  stroke={SURFACE}
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
        </g>
      </svg>

      {cursor != null && (
        <Tooltip
          x={pad.left + xAt(cursor)}
          y={pad.top + plotH / 2}
          align={xAt(cursor) > plotW * 0.62 ? 'right' : 'left'}
          title={labels[cursor]}
          rows={series.map((s) => ({
            color: s.color,
            value: fmt.format(s.values[cursor]),
            label: s.label,
          }))}
        />
      )}
      <span className="sr-only">{`Peak ${valueLabel}: ${Math.max(...series[0].values)}`}</span>
    </div>
  );
}

/* ── Horizontal bars ────────────────────────────────────────────────────── */

/**
 * Nominal categories — vendors, part numbers. Every bar takes the same hue:
 * bar length already encodes the value, and a darker-where-bigger ramp would
 * spend the identity channel restating it.
 *
 * The value rides the tip of each bar, which is what keeps the figure readable
 * without hovering.
 */
export function HBars({ rows, unit = '', barHeight = 14, maxRows = 8 }) {
  /* No tooltip here: the category and its value are both permanently on the
     row, so a hover readout would only restate them. The row still responds to
     hover and focus, which is what tells the reader it is interactive. */
  const shown = rows.slice(0, maxRows);
  const max = Math.max(1, ...shown.map((r) => r.value));

  return (
    <ul className="relative flex flex-col gap-3">
      {shown.map((row, i) => {
        const pct = (row.value / max) * 100;
        return (
          <li
            key={row.label}
            /* Hit area covers the full row, not just the painted bar. */
            className="group relative cursor-default rounded-sm py-0.5 focus-within:bg-press-light hover:bg-press-light"
            tabIndex={0}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-caption text-ink-deep" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 text-caption font-semibold tabular-nums text-ink-deep">
                {fmt.format(row.value)}
                {unit && <span className="ml-1 font-normal text-ink-faint">{unit}</span>}
              </span>
            </div>
            <div
              className="mt-1.5 w-full overflow-hidden rounded-xs"
              style={{ height: barHeight, background: '#f4f3f8' }}
            >
              {/* 4px rounded data-end, square at the baseline. */}
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  background: SERIES.primary,
                  borderRadius: '2px 4px 4px 2px',
                }}
              />
            </div>
            {row.sub && <p className="mt-1 truncate text-[11px] text-ink-faint">{row.sub}</p>}
          </li>
        );
      })}
      {shown.length === 0 && <li className="py-6 text-center text-caption text-ink-faint">Nothing recorded yet</li>}
    </ul>
  );
}

/* ── Columns ────────────────────────────────────────────────────────────── */

/**
 * Distribution across a fixed cycle — hour of day, day of week. One hue; only
 * the peak is direct-labelled, since a number on every column is chaos and goes
 * unread. The rest are in the tooltip and the table.
 */
export function Columns({ rows, height = 132, labelEvery = 1 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const peak = rows.reduce((best, r, i) => (r.value > rows[best]?.value ? i : best), 0);

  /* Heights in pixels rather than percentages: a percentage height inside a
     nested flex column depends on the parent's height being definite, which is
     easy to break later with a layout tweak. `LABEL_BAND` reserves room for the
     peak's direct label so the tallest bar can never push it out of frame. */
  const LABEL_BAND = 16;
  const plotH = Math.max(8, height - LABEL_BAND);

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label="Distribution">
        {rows.map((row, i) => {
          const barH = Math.max(2, Math.round((row.value / max) * plotH));
          const isPeak = i === peak && row.value > 0;
          return (
            <div
              key={row.label}
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end rounded-t-xs focus-visible:outline-none"
            >
              {isPeak && (
                <span className="mb-1 text-[10px] font-semibold leading-none tabular-nums text-ink-deep">
                  {row.value}
                </span>
              )}
              <div
                className="w-full transition-[height] duration-500"
                style={{
                  height: barH,
                  maxWidth: 24,
                  background: SERIES.primary,
                  opacity: hover === null || hover === i ? 1 : 0.45,
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[2px]">
        {rows.map((row, i) => (
          <span key={row.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-ink-faint">
            {i % labelEvery === 0 ? row.short ?? row.label : ''}
          </span>
        ))}
      </div>
      {hover != null && (
        <Tooltip
          x={`${((hover + 0.5) / rows.length) * 100}%`}
          y={height / 2}
          align={hover > rows.length * 0.62 ? 'right' : 'left'}
          title={rows[hover].label}
          rows={[{ color: SERIES.primary, value: fmt.format(rows[hover].value), label: rows[hover].unit || 'lookups' }]}
        />
      )}
    </div>
  );
}

/* ── Heatmap ────────────────────────────────────────────────────────────── */

const WEEKDAY_LABELS = ['Mon', 'Wed', 'Fri'];

/**
 * Calendar of activity, weeks as columns. Magnitude, so one hue light→dark with
 * a scale legend; a day with nothing on it is a near-surface tint with a
 * hairline rather than a step on the ramp, so it still reads as a cell.
 */
export function Heatmap({ weeks, ramp = HEAT_RAMP, thresholds, cell = 18 }) {
  const [hover, setHover] = useState(null);

  const steps = thresholds || [1, 2, 4];
  const colorFor = (count) => {
    if (!count) return HEAT_EMPTY;
    if (count <= steps[0]) return ramp[0];
    if (count <= steps[1]) return ramp[1];
    if (count <= steps[2]) return ramp[2];
    return ramp[3];
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-[2px] pr-1" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="text-[10px] leading-none text-ink-faint">{label}</span>
          ))}
        </div>
        {/* Cells are capped, never stretched. Letting them flex to fill the card
            turned a five-week window into a grid of 131px blocks a thousand
            pixels tall — a calendar is a dense small-multiple, not a mosaic. */}
        <div className="flex gap-[3px] overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex shrink-0 flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.iso}
                  tabIndex={0}
                  onPointerEnter={() => setHover(day)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(day)}
                  onBlur={() => setHover(null)}
                  className="rounded-[3px] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet"
                  style={{
                    background: colorFor(day.count),
                    border: day.count ? 'none' : `1px solid ${GRID}`,
                    width: cell,
                    height: cell,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-ink-faint">Less</span>
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-[3px]"
          style={{ background: HEAT_EMPTY, border: `1px solid ${GRID}` }}
        />
        {ramp.map((step) => (
          <span key={step} aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: step }} />
        ))}
        <span className="text-[10px] text-ink-faint">More</span>
      </div>

      {hover && (
        <Tooltip
          x="50%"
          y={-6}
          title={hover.label}
          rows={[{ color: hover.count ? SERIES.primary : undefined, value: fmt.format(hover.count), label: hover.count === 1 ? 'lookup' : 'lookups' }]}
        />
      )}
    </div>
  );
}

/* ── Meter ──────────────────────────────────────────────────────────────── */

/**
 * A single proportion. The track is a lighter step of the fill's own ramp, so
 * the state reads across the whole bar rather than only where it is filled.
 */
export function Meter({ value, max = 100, caption, hint }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-heading-md font-semibold text-ink-deep">{pct}%</p>
        {caption && <p className="text-caption text-ink-muted">{caption}</p>}
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full"
        style={{ background: '#e7e3f5' }}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={caption || 'Proportion'}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(1, pct)}%`, background: SERIES.primary }}
        />
      </div>
      {hint && <p className="mt-2 text-caption text-ink-faint">{hint}</p>}
    </div>
  );
}

/*
 * No donut here on purpose. A conversion ring — "11 exported of 43 looked up" —
 * is a two-slice pie, and a two-slice pie is a stat tile with extra ink. The
 * proportion goes to `Meter`, the comparison of close values goes to `HBars`.
 */

export { fmt as formatNumber, compact as formatCompact, niceMax };
