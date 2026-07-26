import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Cpu, Factory, RefreshCw, Search } from 'lucide-react';
import { api, absoluteTime, relativeTime } from '../lib/api';
import { Badge, Button, Card, DataGrid, EmptyState, KpiTile, PageHeader, TextInput, Toolbar } from '../components/ui';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/v1/search-history');
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return history;
    return history.filter(
      (record) =>
        record.part_number?.toLowerCase().includes(needle) ||
        record.manufacturer?.toLowerCase().includes(needle)
    );
  }, [history, filter]);

  const distinctParts = useMemo(() => new Set(history.map((h) => h.part_number)).size, [history]);
  const topManufacturer = useMemo(() => {
    const counts = new Map();
    history.forEach((h) => {
      if (!h.manufacturer) return;
      counts.set(h.manufacturer, (counts.get(h.manufacturer) || 0) + 1);
    });
    let best = null;
    counts.forEach((count, name) => {
      if (!best || count > best.count) best = { name, count };
    });
    return best;
  }, [history]);

  /** Lookup share per manufacturer, busiest first — the rail's content. */
  const vendorBreakdown = useMemo(() => {
    const counts = new Map();
    history.forEach((record) => {
      const name = record.manufacturer || 'Unspecified';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, pct: history.length ? Math.round((count / history.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history]);

  const columns = useMemo(
    () => [
      /* Part number is the one unsized column: it holds the value people scan
         for, so it takes the slack the other three don't need. Manufacturer and
         Looked up scale with the table; Actions is rem-fixed so the Re-run
         affordance can never be squeezed out of view. */
      {
        key: 'part',
        header: 'Part number',
        render: (row) => (
          <span className="flex min-w-0 items-center gap-2 text-body-md text-ink-deep">
            <Cpu size={16} aria-hidden="true" className="shrink-0 text-violet-mid" />
            <span className="truncate" title={row.part_number}>
              {row.part_number}
            </span>
          </span>
        ),
      },
      {
        key: 'manufacturer',
        header: 'Manufacturer',
        width: '22%',
        clamp: true,
        render: (row) => (
          <span className="block truncate text-caption text-ink-muted" title={row.manufacturer || undefined}>
            {row.manufacturer || '—'}
          </span>
        ),
      },
      {
        key: 'when',
        header: 'Looked up',
        width: '24%',
        render: (row) => (
          <>
            <span className="block truncate text-caption text-ink-deep">{relativeTime(row.searched_at)}</span>
            <span className="block truncate micro-cap text-ink-faint" title={absoluteTime(row.searched_at)}>
              {absoluteTime(row.searched_at)}
            </span>
          </>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        width: '9rem',
        render: (row) => (
          <Link
            to={`/analysis?part=${encodeURIComponent(row.part_number)}${
              row.manufacturer ? `&manufacturer=${encodeURIComponent(row.manufacturer)}` : ''
            }`}
            className="inline-flex items-center gap-2 whitespace-nowrap text-caption text-ink-muted transition-colors hover:text-ink-deep"
          >
            Re-run
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="workspace">
      <PageHeader
        breadcrumb={['Workspace', 'History']}
        title="Lookup history"
        description="Every part number this account has looked up, newest first. Re-run any of them in one click."
        actions={
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile icon={Search} label="Total lookups" value={loading ? '—' : history.length} sub="All time" />
        <KpiTile icon={Cpu} label="Distinct parts" value={loading ? '—' : distinctParts} sub="Unique MPNs" />
        <KpiTile
          icon={Clock}
          label="Most searched vendor"
          value={topManufacturer ? topManufacturer.name : '—'}
          sub={topManufacturer ? `${topManufacturer.count} lookups` : 'No manufacturer recorded'}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-l-[3px] border-hair-cloud border-l-pink bg-[#fff2f6] px-4 py-3 text-caption text-ink-deep"
        >
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Four columns stretched across a 1900px display read as a sparse
          ribbon, so past 2xl the surplus goes to a vendor rail rather than to
          more padding inside the cells. */}
      <div className="grid flex-1 grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="fill-rest">
          <Toolbar
            icon={Clock}
            title="Lookups"
            meta={
              <Badge tone="light">
                {filtered.length} of {history.length}
              </Badge>
            }
            actions={
              <div className="w-full max-w-xs">
                <TextInput
                  aria-label="Filter history"
                  icon={Search}
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Part number or manufacturer"
                />
              </div>
            }
          />

          {loading ? (
            <div className="grid place-items-center py-16">
              <span className="spinner text-violet-mid" role="status" aria-label="Loading history" />
            </div>
          ) : (
            <DataGrid
              caption="Part lookup history"
              columns={columns}
              rows={filtered}
              getRowKey={(row) => row.id}
              /* Floor only — four columns compress comfortably well below any
                 desktop layout, so this only bites on phones. */
              minWidth={560}
              empty={
                <EmptyState
                  icon={Search}
                  title={history.length ? 'Nothing matches that filter' : 'No lookups yet'}
                  description={
                    history.length
                      ? 'Try a different part number or manufacturer.'
                      : 'Run your first analysis and it will appear here.'
                  }
                  action={history.length ? undefined : <Button to="/analysis" size="sm">Start an analysis</Button>}
                />
              }
            />
          )}
        </Card>

        <Card className="hidden 2xl:block">
          <Toolbar
            icon={Factory}
            title="Vendor mix"
            meta={<Badge tone="light">{vendorBreakdown.length}</Badge>}
          />
          {vendorBreakdown.length === 0 ? (
            <EmptyState icon={Factory} title="Nothing to break down" description="Vendor share appears once you have lookups." />
          ) : (
            <ul className="flex flex-col gap-3 p-5">
              {vendorBreakdown.map((vendor) => (
                <li key={vendor.name}>
                  <div className="flex items-center justify-between gap-2 text-caption">
                    <button
                      type="button"
                      onClick={() => setFilter(vendor.name === 'Unspecified' ? '' : vendor.name)}
                      className="min-w-0 truncate text-left text-ink-deep transition-colors hover:text-violet-deep"
                      title={`Filter to ${vendor.name}`}
                    >
                      {vendor.name}
                    </button>
                    <span className="shrink-0 font-mono text-ink-muted">
                      {vendor.count} · {vendor.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-hair-cloud" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-violet-mid transition-[width] duration-300"
                      style={{ width: `${vendor.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
