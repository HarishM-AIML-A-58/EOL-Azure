import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, HardDrive, RefreshCw, Search } from 'lucide-react';
import { api, absoluteTime, relativeTime, saveBlob } from '../lib/api';
import { Badge, Button, Card, DataGrid, EmptyState, KpiTile, PageHeader, TextInput, Toolbar } from '../components/ui';

/** Human-readable file size; the API reports bytes. */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/v1/reports');
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message || 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = useCallback(async (report) => {
    setDownloading(report.filename);
    setError(null);
    try {
      const res = await api.getRaw(`/api/v1/reports/${encodeURIComponent(report.filename)}`);
      saveBlob(await res.blob(), report.filename);
    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setDownloading(null);
    }
  }, []);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return reports;
    return reports.filter(
      (r) =>
        r.part_number?.toLowerCase().includes(needle) ||
        r.manufacturer?.toLowerCase().includes(needle) ||
        r.filename?.toLowerCase().includes(needle)
    );
  }, [reports, filter]);

  const totalBytes = useMemo(() => reports.reduce((sum, r) => sum + (r.size_bytes || 0), 0), [reports]);

  const columns = useMemo(
    () => [
      /* Widths: percentages for the identity/date columns so they breathe as the
         sidebar collapses, rem for Size and Actions because a badge and a button
         have a hard minimum. File is the one unsized column — it absorbs the
         remainder and truncates, since a filename is the least load-bearing
         value in the row and stays discoverable on hover. */
      {
        key: 'part',
        header: 'Part number',
        width: '24%',
        render: (row) => (
          <>
            <span className="block truncate text-body-md text-ink-deep" title={row.part_number}>
              {row.part_number}
            </span>
            {row.manufacturer && (
              <span className="block truncate text-caption text-ink-faint" title={row.manufacturer}>
                {row.manufacturer}
              </span>
            )}
          </>
        ),
      },
      {
        key: 'generated',
        header: 'Generated',
        width: '18%',
        render: (row) => (
          <>
            <span className="block truncate text-caption text-ink-deep">{relativeTime(row.created_at)}</span>
            <span className="block truncate micro-cap text-ink-faint" title={absoluteTime(row.created_at)}>
              {absoluteTime(row.created_at)}
            </span>
          </>
        ),
      },
      {
        key: 'file',
        header: 'File',
        clamp: true,
        render: (row) => (
          <code title={row.filename} className="block truncate font-mono text-caption text-ink-muted">
            {row.filename}
          </code>
        ),
      },
      {
        key: 'size',
        header: 'Size',
        width: '8rem',
        clamp: true,
        render: (row) => <Badge tone="light">{formatBytes(row.size_bytes)}</Badge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        width: '10.5rem',
        render: (row) => (
          <Button
            size="sm"
            icon={Download}
            className="whitespace-nowrap"
            onClick={() => handleDownload(row)}
            loading={downloading === row.filename}
            disabled={downloading === row.filename}
          >
            Download
          </Button>
        ),
      },
    ],
    [downloading, handleDownload]
  );

  return (
    <div className="workspace">
      <PageHeader
        breadcrumb={['Workspace', 'Reports']}
        title="Reports"
        description="Every colour-coded comparison workbook this account has generated, ready to re-download."
        actions={
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile
          icon={FileSpreadsheet}
          label="Workbooks"
          value={loading ? '—' : reports.length}
          sub="Available to download"
        />
        <KpiTile
          icon={HardDrive}
          label="Stored"
          value={loading ? '—' : formatBytes(totalBytes)}
          sub="Total on the host"
        />
        <KpiTile
          icon={Download}
          label="Latest export"
          value={reports.length ? relativeTime(reports[0].created_at) : '—'}
          sub={reports.length ? reports[0].part_number : 'Nothing exported yet'}
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

      <Card className="fill-rest">
        <Toolbar
          icon={FileSpreadsheet}
          title="Generated workbooks"
          meta={
            <Badge tone="light">
              {filtered.length} of {reports.length}
            </Badge>
          }
          actions={
            <div className="w-full max-w-xs">
              <TextInput
                aria-label="Filter reports"
                icon={Search}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by part or file"
              />
            </div>
          }
        />

        {loading ? (
          <div className="grid place-items-center py-16">
            <span className="spinner text-violet-mid" role="status" aria-label="Loading reports" />
          </div>
        ) : (
          <DataGrid
            caption="Generated comparison workbooks"
            columns={columns}
            rows={filtered}
            getRowKey={(row) => row.filename}
            /* Floor only — below this the unsized File column would collapse to
               nothing. Every layout from a 1024px viewport up clears it, so the
               card only scrolls on phones. */
            minWidth={680}
            empty={
              <EmptyState
                icon={FileSpreadsheet}
                title={reports.length ? 'Nothing matches that filter' : 'No reports yet'}
                description={
                  reports.length
                    ? 'Try a different part number or file name.'
                    : 'Run a part analysis and export the workbook — it will be listed here afterwards.'
                }
                action={reports.length ? undefined : <Button to="/analysis" size="sm">Start an analysis</Button>}
              />
            }
          />
        )}
      </Card>
    </div>
  );
}
