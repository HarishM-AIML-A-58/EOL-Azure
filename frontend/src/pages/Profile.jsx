import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Cpu, FileSpreadsheet, LogOut, Search, ShieldCheck, User } from 'lucide-react';
import { api, absoluteTime, relativeTime } from '../lib/api';
import { signOut } from '../lib/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Badge, Button, Card, CardHead, EmptyState, KpiTile, PageHeader } from '../components/ui';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hair-cloud py-3 last:border-b-0">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-body-md text-ink-deep">{value}</dd>
    </div>
  );
}

export default function Profile() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [historyResult, reportsResult] = await Promise.allSettled([
        api.get('/api/v1/search-history'),
        api.get('/api/v1/reports'),
      ]);
      if (cancelled) return;
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value.history || []);
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value.reports || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const distinctParts = useMemo(() => new Set(history.map((h) => h.part_number)).size, [history]);
  const initials = useMemo(() => (user?.username || '?').slice(0, 2).toUpperCase(), [user]);

  return (
    <div className="workspace">
      <PageHeader
        breadcrumb={['Account', 'Profile']}
        title="Profile"
        description="Your account details and everything you have run through the engine."
        actions={
          <Button variant="ghost" size="sm" icon={LogOut} onClick={() => signOut(navigate)}>
            Sign out
          </Button>
        }
      />

      <Card className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary font-display text-heading-md text-on-primary">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-heading-lg text-ink-deep">{user?.username || '—'}</h2>
          <p className="mt-1 flex items-center gap-2 text-caption text-ink-muted">
            <ShieldCheck size={14} aria-hidden="true" />
            Session authenticated with an HttpOnly cookie
          </p>
        </div>
        <Badge tone="violet">Active</Badge>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile icon={Search} label="Lookups" value={history.length} sub="All time" />
        <KpiTile icon={Cpu} label="Distinct parts" value={distinctParts} sub="Unique MPNs" />
        <KpiTile icon={FileSpreadsheet} label="Workbooks" value={reports.length} sub="Exported reports" />
      </div>

      {/* Details and activity sit side by side from xl up — stacked, they left
          the right half of the page empty on every desktop width. */}
      <div className="grid flex-1 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHead icon={User} title="Account details" description="Read from the authenticated session." />
          <dl className="flex flex-col p-6">
            <DetailRow label="Username" value={user?.username || '—'} />
            <DetailRow label="Account created" value={user?.created_at ? absoluteTime(user.created_at) : '—'} />
            <DetailRow
              label="Last sign-in"
              value={user?.last_login ? `${relativeTime(user.last_login)} · ${absoluteTime(user.last_login)}` : '—'}
            />
          </dl>
        </Card>

        <Card>
          <CardHead icon={Clock} title="Recent activity" description="The last ten part lookups on this account." />
          {history.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No activity yet"
              description="Run a part analysis to start building an activity trail."
              action={<Button to="/analysis" size="sm">Start an analysis</Button>}
            />
          ) : (
            <ul className="flex flex-col p-6">
              {history.slice(0, 10).map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-4 border-b border-hair-cloud py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-md text-ink-deep">Looked up {record.part_number}</span>
                    {record.manufacturer && (
                      <span className="block truncate text-caption text-ink-faint">{record.manufacturer}</span>
                    )}
                  </span>
                  <span className="micro-cap shrink-0 text-ink-faint">{relativeTime(record.searched_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
