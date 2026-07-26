import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Cpu, Download, Factory, FileSpreadsheet,
  Layers, Pencil, Search, Sparkles, Zap,
} from 'lucide-react';
import { api, ApiError, saveBlob } from '../lib/api';
import { readPreferences } from '../hooks/usePreferences';
import SearchHistory from '../components/SearchHistory';
import {
  Badge, Button, Card, DataGrid, EmptyState, Field, PageHeader, Stepper, TextInput, Toolbar,
} from '../components/ui';

/* ── Domain constants ──────────────────────────────────────────────────── */

/** Priority tiers — the engineering judgement the scoring engine encodes. */
const PRIORITIES = [
  { value: 1, label: 'P1 · Must match', short: 'P1', hint: 'a difference disqualifies the candidate' },
  { value: 2, label: 'P2 · Can differ', short: 'P2', hint: 'tolerable variation, flagged for review' },
  { value: 3, label: 'P3 · Cosmetic', short: 'P3', hint: 'packaging, finish, marking' },
];

const PRIORITY_FILL = {
  1: 'var(--color-violet-deep)',
  2: 'var(--color-violet-mid)',
  3: 'var(--color-hair-cool)',
};

const QUICK_SCENARIOS = [
  { label: 'STM32 MCU', part: 'STM32F103C8T6', manufacturer: 'STMicroelectronics' },
  { label: 'LM317 regulator', part: 'LM317T', manufacturer: 'Texas Instruments' },
  { label: 'MCP73831 charger', part: 'MCP73831T-2ACI/OT', manufacturer: 'Microchip' },
];

/**
 * Identification fields, not engineering parameters. A lookup returns 50+ rows
 * and a third of them are catalogue metadata — putting those in the same table
 * as the electrical characteristics buries the decisions that actually matter.
 * They stay in the priority map (the backend still scores them) but live in a
 * collapsed section.
 */
const METADATA_KEYS = new Set([
  'source', 'manufacturer', 'manufacturerpartnumber', 'mpn', 'category', 'description',
  'shortdescription', 'datasheet', 'datasheeturl', 'image', 'imageurl', 'url', 'series',
  'productstatus', 'lifecyclestatus',
]);

const isMetadata = (parameter) => METADATA_KEYS.has(String(parameter).toLowerCase().replace(/[\s_-]/g, ''));

/* ── Sub-components ────────────────────────────────────────────────────── */

/** Segmented priority control — all three tiers visible, one click each. */
function PrioritySelect({ value, parameter, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={`Priority for ${parameter}`}
      className="inline-flex overflow-hidden rounded-md border border-hair-cloud"
    >
      {PRIORITIES.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${p.label} — ${p.hint}`}
            onClick={() => onChange(parameter, p.value)}
            className={`px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active ? 'bg-primary text-on-primary' : 'bg-canvas-light text-ink-muted hover:bg-press-light'
            }`}
          >
            {p.short}
          </button>
        );
      })}
    </div>
  );
}

/** "Set every parameter to…" bulk control. */
function BulkPriority({ onApply, label = 'Set all' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="micro-cap text-ink-faint">{label}</span>
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onApply(p.value)}
          title={`Set every parameter to ${p.label}`}
          className="rounded-md border border-hair-cloud px-2.5 py-1 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-press-light hover:text-ink-deep"
        >
          {p.short}
        </button>
      ))}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [partNumber, setPartNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [specs, setSpecs] = useState([]);
  const [priorityMap, setPriorityMap] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [analysedPart, setAnalysedPart] = useState(null);
  const [status, setStatus] = useState(null); // { tone: 'ok' | 'error', message }
  const [loading, setLoading] = useState(false);
  const [findingAlternatives, setFindingAlternatives] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [paramFilter, setParamFilter] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [editingPart, setEditingPart] = useState(true);

  const historyRef = useRef(null);
  /* Lets the alternatives step trigger an export without a declaration cycle. */
  const downloadRef = useRef(null);

  /* ── Data ────────────────────────────────────────────────────────────── */

  const runLookup = useCallback(async (part, mfr) => {
    const trimmedPart = (part || '').trim();
    if (!trimmedPart) {
      setStatus({ tone: 'error', message: 'Enter a part number to look up.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    setSpecs([]);
    setPriorityMap([]);
    setAlternatives([]);
    setParamFilter('');
    try {
      const query = mfr?.trim() ? `?manufacturer=${encodeURIComponent(mfr.trim())}` : '';
      const data = await api.get(`/api/v1/lookup_eol_specs/${encodeURIComponent(trimmedPart)}${query}`);
      const startingPriority = readPreferences().defaultPriority;
      const rows = (data?.specs ?? []).map((s) => ({ ...s, priority: startingPriority }));
      setSpecs(rows);
      setPriorityMap(rows.map((s) => ({ parameter: s.parameter, priority: startingPriority })));
      setAnalysedPart({ part: trimmedPart, manufacturer: mfr?.trim() || '' });
      setEditingPart(false);
      setStatus({
        tone: 'ok',
        message: `Loaded ${rows.length} parameter${rows.length === 1 ? '' : 's'} for ${trimmedPart}.`,
      });
      historyRef.current?.refresh();
    } catch (err) {
      setStatus({ tone: 'error', message: err instanceof ApiError ? err.message : 'Lookup failed.' });
    } finally {
      setLoading(false);
    }
  }, []);

  /* A part number handed over by the header search runs on arrival. */
  useEffect(() => {
    const part = searchParams.get('part');
    if (!part) return;
    const mfr = searchParams.get('manufacturer') || '';
    setPartNumber(part);
    setManufacturer(mfr);
    runLookup(part, mfr);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, runLookup]);

  const handleDownload = useCallback(async () => {
    if (!priorityMap.length) {
      setStatus({ tone: 'error', message: 'Look up a part before exporting.' });
      return;
    }
    setDownloading(true);
    setStatus(null);
    try {
      const res = await api.postRaw('/api/v1/download_report', {
        eol_part_number: partNumber,
        ...(manufacturer.trim() && { manufacturer: manufacturer.trim() }),
        priority_map: priorityMap,
      });
      const blob = await res.blob();
      saveBlob(blob, `FFF_Report_${partNumber}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setStatus({ tone: 'ok', message: 'Workbook downloaded. A copy is kept under Reports.' });
    } catch (err) {
      setStatus({ tone: 'error', message: err instanceof ApiError ? err.message : 'Report generation failed.' });
    } finally {
      setDownloading(false);
    }
  }, [priorityMap, partNumber, manufacturer]);

  downloadRef.current = handleDownload;

  const handleFindAlternatives = useCallback(async () => {
    if (!priorityMap.length) return;
    setFindingAlternatives(true);
    setStatus(null);
    try {
      const data = await api.post('/api/v1/find_alternatives', {
        eol_part_number: partNumber,
        ...(manufacturer.trim() && { manufacturer: manufacturer.trim() }),
        priority_map: priorityMap,
      });
      const found = data.alternatives || [];
      setAlternatives(found);
      setStatus(
        found.length
          ? { tone: 'ok', message: `Found ${found.length} candidate${found.length === 1 ? '' : 's'}. The workbook is ready to export.` }
          : { tone: 'error', message: 'No alternatives came back for this part.' }
      );
      if (found.length && readPreferences().autoDownload) {
        downloadRef.current?.();
      }
    } catch (err) {
      setStatus({ tone: 'error', message: err instanceof ApiError ? err.message : 'Alternative search failed.' });
    } finally {
      setFindingAlternatives(false);
    }
  }, [priorityMap, partNumber, manufacturer]);

  /* ── Mutations ───────────────────────────────────────────────────────── */

  const setPriority = useCallback((parameter, priority) => {
    setPriorityMap((prev) => prev.map((p) => (p.parameter === parameter ? { ...p, priority } : p)));
    setSpecs((prev) => prev.map((s) => (s.parameter === parameter ? { ...s, priority } : s)));
  }, []);

  /** Applies to the rows currently in view, not silently to all 50+. */
  const applyToVisible = useCallback((priority, parameters) => {
    const target = new Set(parameters);
    setPriorityMap((prev) => prev.map((p) => (target.has(p.parameter) ? { ...p, priority } : p)));
    setSpecs((prev) => prev.map((s) => (target.has(s.parameter) ? { ...s, priority } : s)));
  }, []);

  const handleChangePart = useCallback(() => {
    setEditingPart(true);
    setStatus(null);
  }, []);

  const handleReset = useCallback(() => {
    setPartNumber('');
    setManufacturer('');
    setSpecs([]);
    setPriorityMap([]);
    setAlternatives([]);
    setAnalysedPart(null);
    setParamFilter('');
    setEditingPart(true);
    setStatus(null);
  }, []);

  /* ── Derived ─────────────────────────────────────────────────────────── */

  const { keySpecs, metaSpecs } = useMemo(() => {
    const key = [];
    const meta = [];
    specs.forEach((s) => (isMetadata(s.parameter) ? meta : key).push(s));
    return { keySpecs: key, metaSpecs: meta };
  }, [specs]);

  const visibleKeySpecs = useMemo(() => {
    const needle = paramFilter.trim().toLowerCase();
    if (!needle) return keySpecs;
    return keySpecs.filter(
      (s) =>
        String(s.parameter).toLowerCase().includes(needle) ||
        String(s.value).toLowerCase().includes(needle)
    );
  }, [keySpecs, paramFilter]);

  const distribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    priorityMap.forEach((p) => {
      counts[p.priority] = (counts[p.priority] || 0) + 1;
    });
    return counts;
  }, [priorityMap]);

  /* Exactly one step is active: the first one not yet done. */
  const steps = useMemo(() => {
    const stages = [
      { label: 'Look up the part', hint: analysedPart ? analysedPart.part : 'No part loaded', done: specs.length > 0 },
      {
        label: 'Weight parameters',
        hint: priorityMap.length ? `${priorityMap.length} parameters` : 'Awaiting specs',
        done: alternatives.length > 0,
      },
      {
        label: 'Find alternatives',
        hint: alternatives.length ? `${alternatives.length} candidates` : 'Not run',
        done: alternatives.length > 0,
      },
      { label: 'Export workbook', hint: 'Colour-coded Excel', done: false },
    ];
    const activeIndex = stages.findIndex((s) => !s.done);
    return stages.map((stage, i) => ({
      label: stage.label,
      hint: stage.hint,
      state: stage.done ? 'done' : i === activeIndex ? 'active' : 'todo',
    }));
  }, [specs.length, priorityMap.length, alternatives.length, analysedPart]);

  /**
   * Column widths are explicit on every column but Parameter, which absorbs
   * the slack. Under the grid's `table-fixed` layout that is what keeps the
   * priority control from being pushed out of view by a long value string.
   */
  const specColumns = useMemo(
    () => [
      {
        key: 'index',
        header: '#',
        width: '3rem',
        render: (_row, i) => <span className="text-caption text-ink-faint">{i + 1}</span>,
      },
      {
        key: 'parameter',
        header: 'Parameter',
        clamp: true,
        render: (row) => (
          <span title={row.parameter} className="text-body-md text-ink-deep">
            {row.parameter}
          </span>
        ),
      },
      {
        key: 'value',
        header: 'Value',
        width: '38%',
        clamp: true,
        render: (row) => (
          <code
            title={row.value}
            className="rounded-xs bg-press-light px-2 py-1 font-mono text-[13px] text-ink-deep"
          >
            {row.value}
          </code>
        ),
      },
      {
        key: 'priority',
        header: 'FFF priority',
        width: '11.5rem',
        align: 'right',
        render: (row) => <PrioritySelect value={row.priority} parameter={row.parameter} onChange={setPriority} />,
      },
    ],
    [setPriority]
  );

  const readyToExport = priorityMap.length > 0;

  return (
    <div className="workspace">
      <PageHeader
        breadcrumb={['Workspace', 'Part analysis']}
        title="Part analysis"
        description="Look up an end-of-life part, weight each parameter by Form, Fit and Function, then export a colour-coded comparison workbook."
        actions={
          analysedPart ? (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Start over
            </Button>
          ) : null
        }
      />

      {/* Progress across the whole workflow, always visible. */}
      <Card className="p-5">
        <Stepper steps={steps} />
      </Card>

      {status && (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-md border border-l-[3px] border-hair-cloud px-4 py-3 text-caption text-ink-deep ${
            status.tone === 'ok' ? 'border-l-lime bg-[#f6fbe8]' : 'border-l-pink bg-[#fff2f6]'
          }`}
        >
          {status.tone === 'ok' ? (
            <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          )}
          {status.message}
        </p>
      )}

      {/* The rail grows with the viewport rather than staying pinned at 300px —
          on a wide display the extra room is worth more to the reference panels
          than to an already-roomy table. */}
      <div className="grid flex-1 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_380px] min-[1800px]:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ── Step 1 — lookup ───────────────────────────────────────── */}
          {editingPart || !analysedPart ? (
            <Card>
              <Toolbar icon={Search} title="Look up part specifications" meta={<Badge tone="light">Step 1</Badge>} />

              <form
                className="flex flex-col gap-5 p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  runLookup(partNumber, manufacturer);
                }}
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field id="part-number" label="Part number" required>
                    <TextInput
                      id="part-number"
                      icon={Cpu}
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="e.g. LM317T"
                      disabled={loading}
                      autoComplete="off"
                      autoFocus
                    />
                  </Field>

                  <Field id="manufacturer" label="Manufacturer" optional hint="Narrows the match when a part number is ambiguous">
                    <TextInput
                      id="manufacturer"
                      icon={Factory}
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="e.g. Texas Instruments"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" icon={Search} loading={loading} disabled={loading || !partNumber.trim()}>
                    {loading ? 'Searching' : 'Look up specifications'}
                  </Button>
                  {analysedPart && (
                    <Button type="button" variant="ghost" onClick={() => setEditingPart(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-3 border-t border-hair-cloud px-6 py-4">
                <span className="micro-cap text-ink-faint">Try a scenario</span>
                {QUICK_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.part}
                    type="button"
                    className="btn btn-violet-token"
                    disabled={loading}
                    onClick={() => {
                      setPartNumber(scenario.part);
                      setManufacturer(scenario.manufacturer);
                      runLookup(scenario.part, scenario.manufacturer);
                    }}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            /* Once a part is loaded the form collapses to a summary strip —
               the parameter table is the work, and it needs the vertical room. */
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-press-light text-ink-deep">
                  <Cpu size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="micro-cap text-ink-faint">Under analysis</p>
                  <p className="truncate font-display text-heading-sm text-ink-deep">{analysedPart.part}</p>
                </div>
                <span className="hidden h-8 w-px bg-hair-cloud sm:block" aria-hidden="true" />
                <div className="hidden min-w-0 sm:block">
                  <p className="micro-cap text-ink-faint">Manufacturer</p>
                  <p className="truncate text-body-md text-ink-deep">{analysedPart.manufacturer || 'Any'}</p>
                </div>
                <span className="hidden h-8 w-px bg-hair-cloud lg:block" aria-hidden="true" />
                <div className="hidden lg:block">
                  <p className="micro-cap text-ink-faint">Parameters</p>
                  <p className="text-body-md text-ink-deep">{specs.length}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={Pencil} onClick={handleChangePart}>
                Change part
              </Button>
            </Card>
          )}

          {/* ── Step 2 — weighting ────────────────────────────────────── */}
          {specs.length > 0 && (
            <Card>
              <Toolbar
                icon={Layers}
                title="Weight the parameters"
                meta={<Badge tone="light">Step 2</Badge>}
                actions={
                  <BulkPriority
                    label={paramFilter ? 'Set shown' : 'Set all'}
                    onApply={(p) => applyToVisible(p, visibleKeySpecs.map((s) => s.parameter))}
                  />
                }
              />

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-hair-cloud bg-press-light px-5 py-3">
                {PRIORITIES.map((p) => (
                  <span key={p.value} className="flex items-center gap-2 text-caption text-ink-muted">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PRIORITY_FILL[p.value] }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-ink-deep">{p.label}</span>
                    <span className="hidden xl:inline">— {p.hint}</span>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hair-cloud px-5 py-3">
                <div className="w-full max-w-xs">
                  <TextInput
                    aria-label="Filter parameters"
                    icon={Search}
                    type="search"
                    value={paramFilter}
                    onChange={(e) => setParamFilter(e.target.value)}
                    placeholder="Filter parameters"
                  />
                </div>
                <span className="micro-cap text-ink-faint">
                  Showing {visibleKeySpecs.length} of {keySpecs.length} specifications
                </span>
              </div>

              <DataGrid
                caption="Specification parameters and their FFF priority"
                columns={specColumns}
                rows={visibleKeySpecs}
                getRowKey={(row) => row.parameter}
                minWidth={560}
                empty={
                  <EmptyState
                    icon={Search}
                    title="No parameter matches that filter"
                    description="Clear the filter to see the full specification set."
                  />
                }
              />

              {/* Catalogue metadata: scored, but not where the decisions are. */}
              {metaSpecs.length > 0 && (
                <div className="border-t border-hair-cloud">
                  <button
                    type="button"
                    onClick={() => setShowMetadata((v) => !v)}
                    aria-expanded={showMetadata}
                    className="flex w-full items-center gap-2 px-5 py-3 text-left text-caption text-ink-muted transition-colors hover:bg-press-light hover:text-ink-deep"
                  >
                    {showMetadata ? (
                      <ChevronDown size={16} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={16} aria-hidden="true" />
                    )}
                    Identification &amp; catalogue fields
                    <Badge tone="light" className="ml-1">
                      {metaSpecs.length}
                    </Badge>
                    <span className="ml-auto hidden micro-cap text-ink-faint sm:inline">
                      Included in the export
                    </span>
                  </button>

                  {showMetadata && (
                    <DataGrid
                      caption="Identification and catalogue fields"
                      columns={specColumns}
                      rows={metaSpecs}
                      getRowKey={(row) => row.parameter}
                      minWidth={560}
                    />
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ── Step 3 — alternatives ─────────────────────────────────── */}
          {specs.length > 0 && (
            <Card>
              <Toolbar
                icon={Zap}
                title="Cross-referenced alternatives"
                meta={<Badge tone="light">Step 3</Badge>}
                actions={
                  <Button
                    variant={alternatives.length ? 'ghost' : 'primary'}
                    size="sm"
                    icon={Search}
                    onClick={handleFindAlternatives}
                    loading={findingAlternatives}
                    disabled={findingAlternatives}
                  >
                    {findingAlternatives ? 'Searching' : alternatives.length ? 'Search again' : 'Find alternatives'}
                  </Button>
                }
              />

              {alternatives.length > 0 ? (
                <DataGrid
                  caption="Candidate replacement parts"
                  minWidth={420}
                  columns={[
                    {
                      key: 'rank',
                      header: '#',
                      width: '3rem',
                      render: (_row, i) => <span className="text-caption text-ink-faint">{i + 1}</span>,
                    },
                    {
                      key: 'mpn',
                      header: 'Manufacturer part number',
                      clamp: true,
                      render: (row) => (
                        <span title={row.mpn} className="flex items-center gap-2 text-body-md text-ink-deep">
                          <Cpu size={16} aria-hidden="true" className="shrink-0 text-violet-mid" />
                          {row.mpn}
                        </span>
                      ),
                    },
                    {
                      key: 'manufacturer',
                      header: 'Manufacturer',
                      width: '40%',
                      clamp: true,
                      render: (row) => (
                        <span title={row.manufacturer} className="text-caption text-ink-muted">
                          {row.manufacturer}
                        </span>
                      ),
                    },
                  ]}
                  rows={alternatives}
                  getRowKey={(row, i) => `${row.mpn}-${i}`}
                />
              ) : (
                <EmptyState
                  icon={Zap}
                  title="No candidates yet"
                  description="Run the cross-reference search to pull replacement candidates from Octopart, Digi-Key and Mouser."
                />
              )}
            </Card>
          )}
        </div>

        {/* ── Rail ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Before a part is loaded the mix chart has nothing to say, so the
              slot carries the tier reference instead of sitting empty. */}
          {priorityMap.length === 0 && (
            <Card>
              <Toolbar icon={Layers} title="FFF priority tiers" />
              <ul className="flex flex-col gap-4 p-5">
                {PRIORITIES.map((p) => (
                  <li key={p.value} className="flex gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PRIORITY_FILL[p.value] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-body-md text-ink-deep">{p.label}</span>
                      <span className="block text-caption text-ink-muted">{p.hint}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-hair-cloud px-5 py-4 text-caption text-ink-muted">
                Every parameter carries a tier into the workbook — P1 differences are flagged red, P2 amber,
                P3 informational.
              </p>
            </Card>
          )}

          {priorityMap.length > 0 && (
            <Card>
              <Toolbar title="Priority mix" meta={<Badge tone="light">{priorityMap.length}</Badge>} />
              <ul className="flex flex-col gap-3 p-5">
                {PRIORITIES.map((p) => {
                  const count = distribution[p.value] || 0;
                  const pct = priorityMap.length ? Math.round((count / priorityMap.length) * 100) : 0;
                  return (
                    <li key={p.value}>
                      <div className="flex items-center justify-between gap-2 text-caption">
                        <span className="truncate text-ink-deep">{p.label}</span>
                        <span className="shrink-0 font-mono text-ink-muted">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-hair-cloud" aria-hidden="true">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${pct}%`, background: PRIORITY_FILL[p.value] }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {distribution[1] === 0 && (
                <p className="flex items-start gap-2 border-t border-hair-cloud px-5 py-4 text-caption text-ink-muted">
                  <Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-violet-mid" />
                  Nothing is marked must-match yet. Mark the parameters a replacement cannot deviate on, or the
                  workbook will treat every difference as acceptable.
                </p>
              )}
            </Card>
          )}

          <SearchHistory
            ref={historyRef}
            /* Nothing else competes for the rail before a lookup, so show more. */
            limit={priorityMap.length ? 8 : 12}
            onSelect={(part, mfr) => {
              setPartNumber(part);
              setManufacturer(mfr || '');
              runLookup(part, mfr);
            }}
          />
        </div>
      </div>

      {/*
        Sticky export bar. With 50+ parameters the primary action was always
        off-screen; anchoring it means the workflow's terminal step is reachable
        from anywhere on the page.
      */}
      {readyToExport && (
        <div className="sticky bottom-4 z-20">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hair-cloud bg-canvas-light p-4 shadow-e2">
            <p className="flex items-center gap-2 text-caption text-ink-muted">
              <FileSpreadsheet size={18} aria-hidden="true" className="shrink-0" />
              <span>
                <span className="font-medium text-ink-deep">{priorityMap.length} parameters</span> weighted
                {alternatives.length > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-ink-deep">{alternatives.length} candidates</span>
                  </>
                )}
                {distribution[1] > 0 && ` · ${distribution[1]} must-match`}
              </span>
            </p>
            <Button icon={Download} onClick={handleDownload} loading={downloading} disabled={downloading}>
              {downloading ? 'Generating workbook' : 'Export workbook'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
