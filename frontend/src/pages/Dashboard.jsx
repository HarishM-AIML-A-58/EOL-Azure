import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Cpu, Database, FileSpreadsheet, History as HistoryIcon, Search,
} from 'lucide-react';
import { api, relativeTime } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Badge, Button, Card, EmptyState, KpiTile, PageHeader, Toolbar } from '../components/ui';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SOURCES = [
  ['Octopart', 'octopart'],
  ['Digi-Key', 'digikey'],
  ['Mouser', 'mouser'],
  ['Azure OpenAI', 'azure_openai'],
];

/** Buckets the last 7 days of lookups, oldest first. */
function lookupsByDay(history) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    return { date, label: DAY_LABELS[date.getDay()], count: 0 };
  });

  history.forEach((record) => {
    const when = new Date(record.searched_at);
    if (Number.isNaN(when.getTime())) return;
    when.setHours(0, 0, 0, 0);
    const bucket = days.find((d) => d.date.getTime() === when.getTime());
    if (bucket) bucket.count += 1;
  });

  return days;
}

export default function Dashboard() {
  const user = useCurrentUser();
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [engine, setEngine] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const days = useMemo(() => lookupsByDay(history), [history]);
  const peak = useMemo(() => Math.max(1, ...days.map((d) => d.count)), [days]);
  const weekTotal = useMemo(() => days.reduce((sum, d) => sum + d.count, 0), [days]);
  const distinctParts = useMemo(() => new Set(history.map((h) => h.part_number)).size, [history]);

  /** The MPNs this account keeps coming back to — the re-run shortlist. */
  const topParts = useMemo(() => {
    const counts = new Map();
    history.forEach((record) => {
      if (!record.part_number) return;
      const seen = counts.get(record.part_number);
      counts.set(record.part_number, {
        count: (seen?.count || 0) + 1,
        /* Keep the first manufacturer recorded for the part; later lookups
           often omit it. */
        manufacturer: seen?.manufacturer || record.manufacturer || '',
      });
    });
    return [...counts.entries()]
      .map(([part_number, value]) => ({ part_number, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [history]);

  const connectedSources = useMemo(() => (engine ? Object.values(engine).filter(Boolean).length : 0), [engine]);

  const dash = loading ? '—' : undefined;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={Search}
          label="Total lookups"
          value={dash ?? history.length}
          sub={history.length ? `Last ${relativeTime(history[0].searched_at).toLowerCase()}` : 'None yet'}
        />
        <KpiTile
          icon={Cpu}
          label="Distinct parts"
          value={dash ?? distinctParts}
          sub="Unique MPNs"
        />
        <KpiTile
          icon={FileSpreadsheet}
          label="Workbooks"
          value={dash ?? reports.length}
          sub={reports.length ? 'Ready to download' : 'None exported'}
        />
        <KpiTile
          icon={Database}
          label="Data sources"
          value={dash ?? `${connectedSources}/4`}
          sub={connectedSources === 4 ? 'All connected' : 'Check credentials'}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        {/* ── Activity ─────────────────────────────────────────────────── */}
        <Card>
          <Toolbar
            icon={Activity}
            title="Lookup activity"
            meta={<Badge tone="light">{weekTotal} this week</Badge>}
            actions={<span className="micro-cap text-ink-faint">Last 7 days</span>}
          />

          <div className="p-6">
            <div
              className="flex h-44 items-end gap-3 2xl:h-64"
              role="img"
              aria-label={`${weekTotal} lookups over the last seven days`}
            >
              {days.map((day) => (
                <div key={day.date.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-caption text-ink-muted">{day.count || ''}</span>
                  <div
                    className="w-full rounded-t-xs bg-violet-mid transition-[height] duration-500"
                    style={{ height: `${Math.max(3, (day.count / peak) * 100)}%` }}
                  />
                  <span className="micro-cap text-ink-faint">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-hair-cloud px-6 py-4">
            <Link
              to="/history"
              className="inline-flex items-center gap-2 text-caption text-ink-muted transition-colors hover:text-ink-deep"
            >
              See the full history
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </Card>

        {/* ── Engine status ────────────────────────────────────────────── */}
        <Card>
          <Toolbar
            title="Engine status"
            actions={
              <span className="flex items-center gap-2 micro-cap text-ink-muted">
                <span
                  className={`h-2 w-2 rounded-full ${connectedSources ? 'bg-lime animate-pulse-lime' : 'bg-hair-cool'}`}
                  aria-hidden="true"
                />
                {connectedSources ? 'Live' : 'Idle'}
              </span>
            }
          />
          <ul className="flex flex-col p-5">
            {SOURCES.map(([label, key]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 border-b border-hair-cloud py-3 last:border-b-0"
              >
                <span className="text-body-md text-ink-deep">{label}</span>
                <Badge tone={engine?.[key] ? 'violet' : 'outline'}>
                  {engine?.[key] ? 'Connected' : 'Not configured'}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="border-t border-hair-cloud px-5 py-4">
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 text-caption text-ink-muted transition-colors hover:text-ink-deep"
            >
              Credential settings
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {/* ── Recent lookups ───────────────────────────────────────────── */}
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
          {history.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No lookups yet"
              description="Run your first part analysis to start building a history."
              action={<Button to="/analysis" size="sm">Start an analysis</Button>}
            />
          ) : (
            <ul className="flex flex-col">
              {history.slice(0, 5).map((record) => (
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

        {/* ── Recent workbooks ─────────────────────────────────────────── */}
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
          {reports.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No workbooks yet"
              description="Exported comparison workbooks are listed here for re-download."
            />
          ) : (
            <ul className="flex flex-col">
              {reports.slice(0, 5).map((report) => (
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

        {/* ── Most analysed parts ──────────────────────────────────────── */}
        <Card className="lg:col-span-2 2xl:col-span-1">
          <Toolbar
            icon={Cpu}
            title="Most analysed parts"
            actions={<span className="micro-cap text-ink-faint">All time</span>}
          />
          {topParts.length === 0 ? (
            <EmptyState
              icon={Cpu}
              title="No parts yet"
              description="The MPNs you analyse most often are ranked here for one-click re-runs."
            />
          ) : (
            <ul className="flex flex-col">
              {topParts.map((part) => (
                <li key={part.part_number} className="border-b border-hair-cloud last:border-b-0">
                  <Link
                    to={`/analysis?part=${encodeURIComponent(part.part_number)}${
                      part.manufacturer ? `&manufacturer=${encodeURIComponent(part.manufacturer)}` : ''
                    }`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-press-light"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body-md text-ink-deep">{part.part_number}</span>
                      {part.manufacturer && (
                        <span className="block truncate text-caption text-ink-faint">{part.manufacturer}</span>
                      )}
                    </span>
                    <Badge tone="light">
                      {part.count} {part.count === 1 ? 'lookup' : 'lookups'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
