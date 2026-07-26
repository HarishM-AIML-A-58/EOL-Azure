import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, CalendarDays, Clock, Cpu, Database, FileSpreadsheet, Factory,
  HardDrive, History as HistoryIcon, Percent, Search, Table2,
} from 'lucide-react';
import { api, parseStamp, relativeTime } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Badge, Button, Card, EmptyState, KpiTile, PageHeader, Toolbar } from '../components/ui';
import {
  ChartTable, Columns, HBars, Heatmap, Legend, Meter, SERIES, TimeSeries, formatNumber,
} from '../components/charts';

const SOURCES = [
  ['Octopart', 'octopart', 'Specification source of record'],
  ['Digi-Key', 'digikey', 'Cross-references and pricing'],
  ['Mouser', 'mouser', 'Availability corroboration'],
  ['Azure OpenAI', 'azure_openai', 'FFF classification'],
];

/* One filter row scopes every figure below it, so the numbers always agree.
   Seven days is deliberately not offered: the calendar would collapse to a
   single column and the distributions would be too sparse to read. */
const RANGES = [
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
];

const DAY_MS = 86400000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dayKey = (date) => startOfDay(date).getTime();

const shortDate = (date) =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const longDate = (date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** Bytes as a compact human string; the API reports raw byte counts. */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tally a list into [{label, value, sub}] ordered by count, descending. */
function tally(items, keyOf, subOf) {
  const counts = new Map();
  items.forEach((item) => {
    const key = keyOf(item);
    if (!key) return;
    const seen = counts.get(key);
    counts.set(key, { value: (seen?.value || 0) + 1, sub: seen?.sub || (subOf ? subOf(item) : undefined) });
  });
  return [...counts.entries()]
    .map(([label, rest]) => ({ label, ...rest }))
    .sort((a, b) => b.value - a.value);
}

export default function Dashboard() {
  const user = useCurrentUser();
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [engine, setEngine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState('30');
  const [showTables, setShowTables] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      /* Each panel degrades on its own — one failed call must not blank the page. */
      const [historyResult, reportsResult, statusResult] = await Promise.allSettled([
        api.get('/api/v1/search-history'),
        api.get('/api/v1/reports'),
        api.get('/api/v1/session_status'),
      ]);
      if (cancelled) return;
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value.history || []);
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value.reports || []);
      if (statusResult.status === 'fulfilled') setEngine(statusResult.value.configured_apis || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[0];

  /* ── Normalise once. The API sends naive UTC, so every stamp goes through
        parseStamp or the whole dashboard reads hours off. ─────────────────── */
  const lookups = useMemo(
    () => history
      .map((row) => ({ ...row, at: parseStamp(row.searched_at) }))
      .filter((row) => !Number.isNaN(row.at.getTime()))
      .sort((a, b) => a.at - b.at),
    [history]
  );

  const exports = useMemo(
    () => reports
      .map((row) => ({ ...row, at: parseStamp(row.created_at) }))
      .filter((row) => !Number.isNaN(row.at.getTime()))
      .sort((a, b) => a.at - b.at),
    [reports]
  );

  /* ── Window ─────────────────────────────────────────────────────────────── */
  const { from, days, scopedLookups, scopedExports, previousLookups, previousExports } = useMemo(() => {
    const today = startOfDay(new Date());
    const earliest = lookups.length ? startOfDay(lookups[0].at) : today;
    const spanDays = Math.max(1, Math.round((today - earliest) / DAY_MS) + 1);
    const windowDays = range.days ? Math.min(range.days, Math.max(range.days, spanDays)) : spanDays;
    const start = new Date(today.getTime() - (windowDays - 1) * DAY_MS);
    const prevStart = new Date(start.getTime() - windowDays * DAY_MS);

    const inWindow = (row) => row.at >= start;
    const inPrevious = (row) => row.at >= prevStart && row.at < start;

    return {
      from: start,
      days: windowDays,
      scopedLookups: lookups.filter(inWindow),
      scopedExports: exports.filter(inWindow),
      previousLookups: lookups.filter(inPrevious),
      previousExports: exports.filter(inPrevious),
    };
  }, [lookups, exports, range]);

  /* ── Daily series ───────────────────────────────────────────────────────── */
  const daily = useMemo(() => {
    const buckets = new Map();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(from.getTime() + i * DAY_MS);
      buckets.set(dayKey(date), { date, lookups: 0, exports: 0 });
    }
    scopedLookups.forEach((row) => {
      const bucket = buckets.get(dayKey(row.at));
      if (bucket) bucket.lookups += 1;
    });
    scopedExports.forEach((row) => {
      const bucket = buckets.get(dayKey(row.at));
      if (bucket) bucket.exports += 1;
    });
    return [...buckets.values()];
  }, [from, days, scopedLookups, scopedExports]);

  /* ── Calendar, weeks as columns, Monday first ───────────────────────────── */
  const weeks = useMemo(() => {
    if (!daily.length) return [];
    const byDay = new Map(daily.map((d) => [dayKey(d.date), d.lookups]));
    const first = new Date(from);
    /* Back up to Monday so every column is a real week. */
    const offsetToMonday = (first.getDay() + 6) % 7;
    const gridStart = new Date(first.getTime() - offsetToMonday * DAY_MS);
    const lastDay = daily[daily.length - 1].date;
    const columns = [];
    for (let cursor = gridStart; cursor <= lastDay; cursor = new Date(cursor.getTime() + 7 * DAY_MS)) {
      const week = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(cursor.getTime() + d * DAY_MS);
        const inRange = date >= startOfDay(from) && date <= lastDay;
        week.push({
          iso: date.toISOString().slice(0, 10),
          label: longDate(date),
          count: inRange ? byDay.get(dayKey(date)) || 0 : 0,
        });
      }
      columns.push(week);
    }
    return columns;
  }, [daily, from]);

  /* ── Distributions ──────────────────────────────────────────────────────── */
  const byHour = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, '0')}:00`,
      short: hour % 3 === 0 ? String(hour).padStart(2, '0') : '',
      value: 0,
    }));
    scopedLookups.forEach((row) => { counts[row.at.getHours()].value += 1; });
    return counts;
  }, [scopedLookups]);

  const byWeekday = useMemo(() => {
    const counts = WEEKDAYS.map((label) => ({ label, short: label.slice(0, 1), value: 0 }));
    scopedLookups.forEach((row) => { counts[(row.at.getDay() + 6) % 7].value += 1; });
    return counts;
  }, [scopedLookups]);

  const vendors = useMemo(
    () => tally(scopedLookups, (row) => row.manufacturer || 'Unspecified'),
    [scopedLookups]
  );

  const topParts = useMemo(
    () => tally(scopedLookups, (row) => row.part_number, (row) => row.manufacturer || ''),
    [scopedLookups]
  );

  /* ── Cumulative storage ─────────────────────────────────────────────────── */
  const storage = useMemo(() => {
    let running = 0;
    const byDay = new Map();
    scopedExports.forEach((row) => {
      byDay.set(dayKey(row.at), (byDay.get(dayKey(row.at)) || 0) + (row.size_bytes || 0));
    });
    return daily.map((d) => {
      running += byDay.get(dayKey(d.date)) || 0;
      return { date: d.date, kb: Math.round((running / 1024) * 10) / 10 };
    });
  }, [daily, scopedExports]);

  /* ── Headline numbers ───────────────────────────────────────────────────── */
  const distinctParts = useMemo(() => new Set(scopedLookups.map((r) => r.part_number)).size, [scopedLookups]);
  const connectedSources = useMemo(() => (engine ? Object.values(engine).filter(Boolean).length : 0), [engine]);
  const exportRate = scopedLookups.length ? Math.round((scopedExports.length / scopedLookups.length) * 100) : 0;
  const totalBytes = useMemo(() => scopedExports.reduce((sum, r) => sum + (r.size_bytes || 0), 0), [scopedExports]);
  const busiestHour = useMemo(() => byHour.reduce((best, h) => (h.value > best.value ? h : best), byHour[0]), [byHour]);
  const activeDays = useMemo(() => daily.filter((d) => d.lookups > 0).length, [daily]);

  /* Facts that sit beside the calendar — the numbers a reader would otherwise
     have to count cells to get. */
  const pattern = useMemo(() => {
    const busiest = daily.reduce((best, d) => (d.lookups > (best?.lookups || 0) ? d : best), null);
    let streak = 0;
    let longest = 0;
    daily.forEach((d) => {
      streak = d.lookups > 0 ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    });
    const perActive = activeDays ? scopedLookups.length / activeDays : 0;
    return {
      busiest,
      longestStreak: longest,
      perActive: Math.round(perActive * 10) / 10,
    };
  }, [daily, activeDays, scopedLookups.length]);

  /* Last twelve daily buckets, for the tile sparklines. */
  const trend = (field) => daily.slice(-12).map((d) => d[field]);

  const dash = loading ? '—' : undefined;
  const rangeName = range.days ? `prev ${range.days}d` : 'prev period';

  return (
    <div className="workspace">
      <PageHeader
        breadcrumb={['Workspace', 'Dashboard']}
        title={user?.username ? `Welcome back, ${user.username}` : 'Dashboard'}
        description="A read on the engine and everything this account has run through it."
        actions={
          <Button to="/analysis" size="sm" icon={Search}>
            New analysis
          </Button>
        }
      />

      {/* ── Filter row. One row, above everything it scopes. ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hair-cloud bg-canvas-light px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 micro-cap text-ink-faint">
            <CalendarDays size={14} aria-hidden="true" />
            Period
          </span>
          <div role="radiogroup" aria-label="Reporting period" className="inline-flex overflow-hidden rounded-md border border-hair-cloud">
            {RANGES.map((option) => {
              const active = option.key === rangeKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRangeKey(option.key)}
                  className={`px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    active ? 'bg-primary text-on-primary' : 'bg-canvas-light text-ink-muted hover:bg-press-light'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <span className="text-caption text-ink-faint">
            {shortDate(from)} — {shortDate(new Date())} · {activeDays} active {activeDays === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Every figure has a table twin; this reveals them all at once rather
            than putting a control inside each card. */}
        <button
          type="button"
          onClick={() => setShowTables((v) => !v)}
          aria-pressed={showTables}
          className="btn btn-ghost btn-sm gap-2"
        >
          <Table2 size={16} aria-hidden="true" />
          {showTables ? 'Hide data tables' : 'Show data tables'}
        </button>
      </div>

      {/* ── Stat tiles ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={Search}
          label="Lookups"
          value={dash ?? formatNumber.format(scopedLookups.length)}
          sub={scopedLookups.length ? `Last ${relativeTime(scopedLookups[scopedLookups.length - 1].searched_at).toLowerCase()}` : 'None in this period'}
          delta={{ value: scopedLookups.length - previousLookups.length, label: rangeName }}
          trend={trend('lookups')}
        />
        <KpiTile
          icon={Cpu}
          label="Distinct parts"
          value={dash ?? distinctParts}
          sub={`${topParts.length ? topParts[0].label : '—'} most analysed`}
        />
        <KpiTile
          icon={FileSpreadsheet}
          label="Workbooks"
          value={dash ?? scopedExports.length}
          sub={formatBytes(totalBytes)}
          delta={{ value: scopedExports.length - previousExports.length, label: rangeName }}
          trend={trend('exports')}
        />
        <KpiTile
          icon={Percent}
          label="Export rate"
          value={dash ?? `${exportRate}%`}
          sub="Lookups that ended in a workbook"
        />
      </div>

      {/* ── Activity over time ─────────────────────────────────────────────── */}
      <Card>
        <Toolbar
          icon={Activity}
          title="Lookups and exports"
          meta={<Badge tone="light">{scopedLookups.length} lookups</Badge>}
          actions={
            <Legend
              items={[
                { label: 'Lookups', color: SERIES.primary, shape: 'rect' },
                { label: 'Workbooks exported', color: SERIES.accent, shape: 'line' },
              ]}
            />
          }
        />
        <div className="p-5">
          {daily.length ? (
            <TimeSeries
              labels={daily.map((d) => shortDate(d.date))}
              series={[
                { key: 'lookups', label: 'Lookups', color: SERIES.primary, shape: 'area', values: daily.map((d) => d.lookups) },
                { key: 'exports', label: 'Workbooks', color: SERIES.accent, shape: 'line', values: daily.map((d) => d.exports) },
              ]}
              height={260}
            />
          ) : (
            <EmptyState icon={Activity} title="No activity in this period" description="Widen the period or run an analysis." />
          )}
        </div>
        {showTables && (
          <ChartTable
            caption="Lookups and exports per day"
            columns={['Day', 'Lookups', 'Workbooks']}
            rows={daily.filter((d) => d.lookups || d.exports).map((d) => [shortDate(d.date), d.lookups, d.exports])}
          />
        )}
      </Card>

      {/* ── Calendar + conversion ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <Toolbar
            icon={CalendarDays}
            title="Working pattern"
            meta={<Badge tone="light">{activeDays} active days</Badge>}
            actions={<span className="micro-cap text-ink-faint">Weeks as columns</span>}
          />
          <div className="flex flex-wrap items-start justify-between gap-8 p-5">
            <Heatmap weeks={weeks} />
            <dl className="grid min-w-[13rem] flex-1 grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['Busiest day', pattern.busiest?.lookups ? `${shortDate(pattern.busiest.date)} · ${pattern.busiest.lookups}` : '—'],
                ['Longest streak', pattern.longestStreak ? `${pattern.longestStreak} ${pattern.longestStreak === 1 ? 'day' : 'days'}` : '—'],
                ['Per active day', pattern.perActive || '—'],
                ['Quietest weekday', byWeekday.reduce((worst, d) => (d.value < worst.value ? d : worst), byWeekday[0]).label],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="micro-cap text-ink-faint">{label}</dt>
                  <dd className="mt-0.5 text-body-md font-medium text-ink-deep">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {showTables && (
            <ChartTable
              caption="Lookups per active day"
              columns={['Day', 'Lookups']}
              rows={daily.filter((d) => d.lookups).map((d) => [longDate(d.date), d.lookups])}
            />
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <Toolbar icon={Percent} title="Lookup to workbook" />
            <div className="p-5">
              <Meter
                value={scopedExports.length}
                max={Math.max(1, scopedLookups.length)}
                caption={`${scopedExports.length} of ${scopedLookups.length} lookups`}
                hint="Not every lookup should end in an export — a candidate ruled out on Form, Fit and Function is a finished piece of work too."
              />
            </div>
          </Card>

          <Card>
            <Toolbar icon={Database} title="Engine status" actions={
              <span className="flex items-center gap-2 micro-cap text-ink-muted">
                <span
                  className={`h-2 w-2 rounded-full ${connectedSources ? 'bg-lime animate-pulse-lime' : 'bg-hair-cool'}`}
                  aria-hidden="true"
                />
                {connectedSources ? 'Live' : 'Catalogue only'}
              </span>
            } />
            <div className="border-b border-hair-cloud p-5">
              <Meter
                value={connectedSources}
                max={SOURCES.length}
                caption={`${connectedSources} of ${SOURCES.length} sources`}
                hint={connectedSources === SOURCES.length
                  ? 'Every distributor is answering.'
                  : 'Unconfigured sources fall back to the offline catalogue.'}
              />
            </div>
            <ul className="flex flex-col p-5">
              {SOURCES.map(([label, key, role]) => (
                <li key={key} className="flex items-center justify-between gap-4 border-b border-hair-cloud py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate text-body-md text-ink-deep">{label}</span>
                    <span className="block truncate text-caption text-ink-faint">{role}</span>
                  </span>
                  <Badge tone={engine?.[key] ? 'violet' : 'outline'}>
                    {engine?.[key] ? 'Connected' : 'Not configured'}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="border-t border-hair-cloud px-5 py-4">
              <Link to="/settings" className="inline-flex items-center gap-2 text-caption text-ink-muted transition-colors hover:text-ink-deep">
                Credential settings
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Composition ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <Card>
          <Toolbar icon={Cpu} title="Most analysed parts" meta={<Badge tone="light">{topParts.length}</Badge>} />
          <div className="p-5">
            <HBars rows={topParts.map((p) => ({ ...p, sub: p.sub }))} maxRows={7} />
          </div>
          {showTables && (
            <ChartTable
              caption="Lookups per part number"
              columns={['Part number', 'Lookups']}
              rows={topParts.map((p) => [p.label, p.value])}
            />
          )}
        </Card>

        <Card>
          <Toolbar icon={Factory} title="Manufacturer mix" meta={<Badge tone="light">{vendors.length}</Badge>} />
          <div className="p-5">
            <HBars rows={vendors} maxRows={7} />
          </div>
          {showTables && (
            <ChartTable
              caption="Lookups per manufacturer"
              columns={['Manufacturer', 'Lookups']}
              rows={vendors.map((v) => [v.label, v.value])}
            />
          )}
        </Card>

        <Card className="lg:col-span-2 2xl:col-span-1">
          <Toolbar
            icon={HardDrive}
            title="Workbook storage"
            actions={<span className="micro-cap text-ink-faint">Cumulative KB</span>}
          />
          <div className="p-5">
            {storage.length ? (
              <TimeSeries
                labels={storage.map((s) => shortDate(s.date))}
                series={[{ key: 'kb', label: 'Stored (KB)', color: SERIES.primary, shape: 'area', values: storage.map((s) => s.kb) }]}
                height={200}
                valueLabel="KB stored"
              />
            ) : (
              <EmptyState icon={HardDrive} title="Nothing stored yet" />
            )}
          </div>
          {showTables && (
            <ChartTable
              caption="Cumulative workbook storage"
              columns={['Day', 'KB stored']}
              rows={storage.filter((s, i, arr) => i === 0 || s.kb !== arr[i - 1].kb).map((s) => [shortDate(s.date), s.kb])}
            />
          )}
        </Card>
      </div>

      {/* ── When the work happens ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <Toolbar
            icon={Clock}
            title="Hour of day"
            actions={<span className="micro-cap text-ink-faint">Busiest: {busiestHour?.label}</span>}
          />
          <div className="p-5">
            <Columns rows={byHour} height={140} />
          </div>
          {showTables && (
            <ChartTable
              caption="Lookups per hour of day"
              columns={['Hour', 'Lookups']}
              rows={byHour.filter((h) => h.value).map((h) => [h.label, h.value])}
            />
          )}
        </Card>

        <Card>
          <Toolbar icon={CalendarDays} title="Day of week" />
          <div className="p-5">
            <Columns rows={byWeekday} height={140} />
          </div>
          {showTables && (
            <ChartTable
              caption="Lookups per day of week"
              columns={['Day', 'Lookups']}
              rows={byWeekday.map((d) => [d.label, d.value])}
            />
          )}
        </Card>
      </div>

      {/* ── Recent activity ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <Toolbar
            icon={HistoryIcon}
            title="Recent lookups"
            actions={
              <Link to="/history" className="micro-cap text-ink-muted transition-colors hover:text-ink-deep">
                View all
              </Link>
            }
          />
          {lookups.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No lookups yet"
              description="Run your first part analysis to start building a history."
              action={<Button to="/analysis" size="sm">Start an analysis</Button>}
            />
          ) : (
            <ul className="flex flex-col">
              {[...lookups].reverse().slice(0, 6).map((record) => (
                <li key={record.id} className="border-b border-hair-cloud last:border-b-0">
                  <Link
                    to={`/analysis?part=${encodeURIComponent(record.part_number)}${
                      record.manufacturer ? `&manufacturer=${encodeURIComponent(record.manufacturer)}` : ''
                    }`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-press-light"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body-md text-ink-deep">{record.part_number}</span>
                      {record.manufacturer && (
                        <span className="block truncate text-caption text-ink-faint">{record.manufacturer}</span>
                      )}
                    </span>
                    <span className="micro-cap shrink-0 text-ink-faint">{relativeTime(record.searched_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Toolbar
            icon={FileSpreadsheet}
            title="Recent workbooks"
            actions={
              <Link to="/reports" className="micro-cap text-ink-muted transition-colors hover:text-ink-deep">
                View all
              </Link>
            }
          />
          {exports.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No workbooks yet"
              description="Exported comparison workbooks are listed here for re-download."
            />
          ) : (
            <ul className="flex flex-col">
              {[...exports].reverse().slice(0, 6).map((report) => (
                <li
                  key={report.filename}
                  className="flex items-center justify-between gap-3 border-b border-hair-cloud px-5 py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-md text-ink-deep">{report.part_number}</span>
                    <span className="block truncate text-caption text-ink-faint">{report.filename}</span>
                  </span>
                  <span className="micro-cap shrink-0 text-ink-faint">{relativeTime(report.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
