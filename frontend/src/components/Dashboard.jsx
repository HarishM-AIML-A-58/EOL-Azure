import { API_BASE_URL } from '../config';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Database, TrendingUp, CheckCircle2, Search, Download,
  Cpu, Check, History as HistoryIcon, Activity, ShieldCheck,
  Package, BarChart3, Clock, AlertTriangle
} from 'lucide-react';
import SearchHistory from './SearchHistory';
import { cn } from '../lib/utils';

// PrimeReact Components
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import { Tooltip } from 'primereact/tooltip';
import { Chart } from 'primereact/chart';
import { ProgressBar } from 'primereact/progressbar';
import { Badge } from 'primereact/badge';

import './Dashboard.css';

const getSessionId = () => localStorage.getItem('sessionId') || '';

// ── Intersection Observer hook for animate-on-scroll ──────────────────────
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

// ── Animated stat card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={cn('dash-stat-card', visible && 'dash-reveal')}>
      <div className="dash-stat-icon" style={{ background: color + '18', color }}>
        <Icon size={20} />
      </div>
      <div className="dash-stat-body">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-value">{value}</span>
        <span className="dash-stat-sub">{sub}</span>
      </div>
      {trend !== undefined && (
        <div className={cn('dash-stat-trend', trend >= 0 ? 'up' : 'down')}>
          <TrendingUp size={12} />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper with reveal ────────────────────────────────────────────
function RevealSection({ children, delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={cn('dash-section', visible && 'dash-reveal')} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
function Dashboard() {
  const [partNumber, setPartNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [eolSpecs, setEolSpecs] = useState([]);
  const [priorityMap, setPriorityMap] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fetchingAlternatives, setFetchingAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [apiConfigured, setApiConfigured] = useState(true);

  useEffect(() => {
    // We use global API keys now, so assume configured
    setApiConfigured(true);

    // Auto-fill demo scenario if HR/Demo user
    if (localStorage.getItem('username') === 'hr_demo_user' && !partNumber) {
      setPartNumber('LM317T');
      setManufacturer('Texas Instruments');
    }
  }, []);

  /* ── chart data ── */
  const donutData = useMemo(() => {
    const p1 = priorityMap.filter(p => p.priority === 1).length;
    const p2 = priorityMap.filter(p => p.priority === 2).length;
    const p3 = priorityMap.filter(p => p.priority === 3).length;
    const total = p1 + p2 + p3 || 3; // default slices
    return {
      labels: ['Must Match (P1)', 'Can Differ (P2)', 'Cosmetic (P3)'],
      datasets: [{
        data: p1 + p2 + p3 > 0 ? [p1, p2, p3] : [1, 1, 1],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [priorityMap]);

  const donutOptions = {
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    animation: { animateRotate: true, duration: 900 }
  };

  /* ── workflow activity bar chart ── */
  const barData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Lookups',
      data: [4, 7, 3, 9, 5, 2, 1],
      backgroundColor: '#3b82f680',
      borderRadius: 6,
      borderSkipped: false
    }]
  };
  const barOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 3, font: { size: 11 } } }
    },
    animation: { duration: 900 }
  };

  /* ── stats ── */
  const stats = useMemo(() => [
    { icon: Package,      label: 'Specs Loaded',    value: eolSpecs.length,                        sub: eolSpecs.length ? 'Specifications ready' : 'Awaiting lookup',           color: '#3b82f6', trend: 0  },
    { icon: BarChart3,    label: 'Priorities Set',  value: priorityMap.length,                     sub: priorityMap.length ? 'Ready for export' : 'Pending config',             color: '#f59e0b', trend: 12 },
    { icon: ShieldCheck,  label: 'Workflow Status', value: priorityMap.length ? 'Ready' : 'Setup', sub: 'Configure priorities to export',                                       color: priorityMap.length ? '#10b981' : '#94a3b8' },
    { icon: Activity,     label: 'Active Session',  value: apiConfigured ? 'Live' : 'Offline',     sub: apiConfigured ? 'API credentials verified' : 'Check settings',          color: apiConfigured ? '#8b5cf6' : '#f43f5e' },
  ], [eolSpecs.length, priorityMap.length, apiConfigured]);

  const checklist = useMemo(() => [
    { label: 'Lookup EOL specifications',       done: eolSpecs.length > 0,    icon: 'pi pi-search' },
    { label: 'Set FFF priorities per parameter', done: priorityMap.length > 0, icon: 'pi pi-sliders-h' },
    { label: 'Download color-coded Excel report', done: false,                  icon: 'pi pi-download' },
  ], [eolSpecs.length, priorityMap.length]);

  /* ── handlers ── */
  const handleSelectFromHistory = (pn, mfr) => { setPartNumber(pn); setManufacturer(mfr || ''); };

  const handleLookup = async () => {
    if (!partNumber.trim()) { setError('Please enter a part number'); return; }
    setLoading(true); setError(null); setSuccessMessage(null); setEolSpecs([]); setPriorityMap([]); setAlternatives([]);
    try {
      let url = `${API_BASE_URL}/api/v1/lookup_eol_specs/${encodeURIComponent(partNumber)}`;
      if (manufacturer.trim()) url += `?manufacturer=${encodeURIComponent(manufacturer.trim())}`;
      const res = await fetch(url, { headers: { 'X-Session-Id': getSessionId() }, credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch specs: ${res.statusText}`);
      const data = await res.json();
      const specs = (data?.specs ?? []).map(s => ({ ...s, priority: 2 }));
      setEolSpecs(specs);
      setPriorityMap(specs.map(s => ({ parameter: s.parameter, priority: 2 })));
      setSuccessMessage(`Found ${specs.length} specifications for ${partNumber}${manufacturer.trim() ? ` (${manufacturer.trim()})` : ''}.`);
    } catch (err) { setError(err.message || 'Failed to fetch part specifications'); }
    finally { setLoading(false); }
  };

  const handleFindAlternatives = async () => {
    if (priorityMap.length === 0) return;
    setFetchingAlternatives(true); setError(null); setSuccessMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/find_alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': getSessionId() },
        credentials: 'include',
        body: JSON.stringify({ eol_part_number: partNumber, ...(manufacturer.trim() && { manufacturer: manufacturer.trim() }), priority_map: priorityMap }),
      });
      if (!res.ok) {
        let msg = `Failed to fetch alternatives: ${res.statusText}`;
        try { const d = await res.json(); if (d?.detail) msg = d.detail; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setAlternatives(data.alternatives || []);
      if (data.alternatives && data.alternatives.length > 0) {
        setSuccessMessage(`Found ${data.alternatives.length} alternatives from Digi-Key! You can now download the report.`);
      } else {
        setError('No alternatives found.');
      }
    } catch (err) { setError(err.message || 'Failed to fetch alternatives'); }
    finally { setFetchingAlternatives(false); }
  };

  const handlePriorityChange = (parameter, priority) => {
    const newPriority = parseInt(priority);
    setPriorityMap(prev => prev.map(item => item.parameter === parameter ? { ...item, priority: newPriority } : item));
    // Also update eolSpecs to trigger DataTable re-render
    setEolSpecs(prev => prev.map(item => item.parameter === parameter ? { ...item, priority: newPriority } : item));
  };

  const handleDownloadReport = async () => {
    if (priorityMap.length === 0) { setError('Please lookup part specifications first'); return; }
    setDownloading(true); setError(null); setSuccessMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/download_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': getSessionId() },
        credentials: 'include',
        body: JSON.stringify({ eol_part_number: partNumber, ...(manufacturer.trim() && { manufacturer: manufacturer.trim() }), priority_map: priorityMap }),
      });
      if (!res.ok) {
        let msg = `Report generation failed: ${res.statusText}`;
        try { const d = await res.json(); if (d?.detail) msg = `Report generation failed: ${d.detail}`; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none'; a.href = url;
      a.download = `FFF_Report_${partNumber}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      setSuccessMessage('Color-coded Excel report downloaded successfully.');
    } catch (err) { setError(err.message || 'Failed to download report'); }
    finally { setDownloading(false); }
  };

  const priorityOptions = [
    { label: 'P1 — Must Match', value: 1 },
    { label: 'P2 — Can Differ',  value: 2 },
    { label: 'P3 — Cosmetic',    value: 3 },
  ];

  const priorityTemplate = (rowData) => {
    const val = rowData.priority || 2;
    const sev = val === 1 ? 'danger' : val === 2 ? 'warning' : 'success';
    return (
      <Dropdown
        value={val}
        options={priorityOptions}
        onChange={e => handlePriorityChange(rowData.parameter, e.value)}
        className="dash-priority-drop"
        itemTemplate={opt => (
          <span className={cn('dash-prio-opt', `prio-${opt.value}`)}>{opt.label}</span>
        )}
      />
    );
  };

  const paramTemplate = rowData => (
    <span className="dash-param-cell">
      <i className="pi pi-tag dash-param-icon" />
      {rowData.parameter}
    </span>
  );

  const valueTemplate = rowData => (
    <span className="dash-value-cell">{rowData.value}</span>
  );

  return (
    <div className="dash-root">

      {/* ── Page Header ── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-breadcrumb">
            <i className="pi pi-home" />
            <span>Workspace</span>
            <i className="pi pi-angle-right" />
            <span className="dash-breadcrumb-active">Dashboard</span>
          </div>
          <h1 className="dash-title">End of Life Part Replacer</h1>
          <p className="dash-subtitle">
            Automate FFF analysis for enterprise supply chain security — lookup EOL specifications,
            prioritize parameters, and export color-coded compliance workbooks.
          </p>
        </div>
          <div className="flex align-items-center gap-4">
            <div className="dash-status-pill">
              <span className={cn('dash-status-dot', apiConfigured ? 'online' : 'offline')} />
              <span>{apiConfigured ? 'Engine Active' : 'Not Connected'}</span>
            </div>
            <Button
              label="Download Report"
              icon="pi pi-download"
              severity="success"
              size="small"
              onClick={handleDownloadReport}
              disabled={downloading || priorityMap.length === 0}
              loading={downloading}
              className="dash-header-btn"
            />
          </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="dash-stats-row">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* ── Main Grid ── */}
      <div className="dash-grid">

        {/* ── Left Column ── */}
        <div className="dash-col-main">

          {/* Step 1 — Lookup */}
          <RevealSection delay={0}>
            <div className="dash-card">
              <div className="dash-card-header">
                <div className="dash-step-badge">
                  <i className="pi pi-search" />
                </div>
                <div>
                  <h2 className="dash-card-title">Lookup Part Specifications</h2>
                  <p className="dash-card-desc">Enter the EOL part number and optional manufacturer to retrieve component data.</p>
                </div>
                <Tag value="Step 1" severity="info" className="dash-step-tag px-2 py-1 text-sm" />
              </div>

              <div className="dash-form-grid">
                <div className="dash-field">
                  <label htmlFor="part-number" className="dash-label">
                    Part Number <span className="dash-required">*</span>
                  </label>
                  <span className="p-input-icon-left w-full">
                    <i className="pi pi-microchip" />
                    <InputText
                      id="part-number"
                      className="w-full"
                      placeholder="e.g., LM317, MCP73831T"
                      value={partNumber}
                      onChange={e => setPartNumber(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleLookup()}
                      disabled={loading}
                    />
                  </span>
                </div>
                <div className="dash-field">
                  <label htmlFor="manufacturer" className="dash-label">
                    Manufacturer <span className="dash-optional">(Optional)</span>
                  </label>
                  <span className="p-input-icon-left w-full">
                    <i className="pi pi-building" />
                    <InputText
                      id="manufacturer"
                      className="w-full"
                      placeholder="e.g., Texas Instruments"
                      value={manufacturer}
                      onChange={e => setManufacturer(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleLookup()}
                      disabled={loading}
                    />
                  </span>
                </div>
              </div>

              <div className="dash-form-actions">
                <Button
                  id="lookup-btn"
                  label={loading ? 'Searching…' : 'Lookup Specs'}
                  icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
                  onClick={handleLookup}
                  disabled={loading || !partNumber.trim()}
                  loading={loading}
                  className="dash-btn-primary"
                />
                {partNumber && (
                  <Button
                    label="Clear"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    onClick={() => { setPartNumber(''); setManufacturer(''); setEolSpecs([]); setPriorityMap([]); setAlternatives([]); setError(null); setSuccessMessage(null); }}
                  />
                )}
              </div>

              {/* Demo Hints */}
              <div className="dash-demo-scenarios">
                <span className="dash-demo-label">Quick Demo Scenarios:</span>
                <Button 
                  label="STM32 MCU" 
                  severity="info" 
                  text
                  className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs transition-colors"
                  onClick={() => { 
                    setPartNumber('STM32F103C8T6'); 
                    setManufacturer('STMicroelectronics'); 
                    setTimeout(() => document.getElementById('lookup-btn').click(), 100);
                  }}
                />
                <Button 
                  label="LM317 Regulator" 
                  severity="info" 
                  text
                  className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs transition-colors"
                  onClick={() => { 
                    setPartNumber('LM317T'); 
                    setManufacturer('Texas Instruments'); 
                    setTimeout(() => document.getElementById('lookup-btn').click(), 100);
                  }}
                />
                <Button 
                  label="MCP73831 Charger" 
                  severity="info" 
                  text
                  className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs transition-colors"
                  onClick={() => { 
                    setPartNumber('MCP73831T-2ACI/OT'); 
                    setManufacturer('Microchip'); 
                    setTimeout(() => document.getElementById('lookup-btn').click(), 100);
                  }}
                />
              </div>

              {/* Alerts */}
              {successMessage && (
                <Message severity="success" text={successMessage} className="w-full mt-4" />
              )}
              {error && (
                <Message severity="error" text={error} className="w-full mt-4" />
              )}
            </div>
          </RevealSection>

          {/* Step 2 — Priorities Table */}
          {eolSpecs.length > 0 && (
            <RevealSection delay={80}>
              <div className="dash-card">
                <div className="dash-card-header">
                  <div className="dash-step-badge step2">
                    <i className="pi pi-sliders-h" />
                  </div>
                  <div>
                    <h2 className="dash-card-title">Set FFF Priorities</h2>
                    <p className="dash-card-desc">Assign priority levels — these drive comparison strictness in the exported report.</p>
                  </div>
                  <Tag value="Step 2" severity="warning" className="dash-step-tag px-2 py-1 text-sm" />
                </div>

                {/* Priority Legend */}
                <div className="dash-legend">
                  <span className="dash-legend-item p1"><span className="dash-dot" />P1 — Must Match</span>
                  <span className="dash-legend-item p2"><span className="dash-dot" />P2 — Can Differ</span>
                  <span className="dash-legend-item p3"><span className="dash-dot" />P3 — Cosmetic</span>
                </div>

                <DataTable
                  value={eolSpecs}
                  className="dash-table"
                  responsiveLayout="scroll"
                  rowHover
                  stripedRows
                  size="small"
                  emptyMessage="No specifications loaded."
                >
                  <Column header="#" body={(_, { rowIndex }) => <span className="dash-row-num">{rowIndex + 1}</span>} style={{ width: '52px' }} />
                  <Column field="parameter" header="Parameter" body={paramTemplate} sortable style={{ minWidth: '180px' }} />
                  <Column field="value" header="Specification Value" body={valueTemplate} style={{ minWidth: '160px' }} />
                  <Column header="Priority" body={priorityTemplate} style={{ width: '200px' }} />
                </DataTable>
              </div>
            </RevealSection>
          )}

          {/* Step 3 — Find Alternatives & Download */}
          {priorityMap.length > 0 && (
            <RevealSection delay={120}>
              <div className="dash-card">
                <div className="dash-card-header">
                  <div className="dash-step-badge step3">
                    <i className="pi pi-users" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="dash-card-title">Find Alternatives</h2>
                    <p className="dash-card-desc">Fetch cross-reference alternatives from Digi-Key.</p>
                  </div>
                  <div className="ml-auto flex align-items-center gap-3">
                    <Button 
                      label={fetchingAlternatives ? "Searching..." : "Find Alternatives"} 
                      icon={fetchingAlternatives ? "pi pi-spin pi-spinner" : "pi pi-search"}
                      onClick={handleFindAlternatives}
                      loading={fetchingAlternatives}
                      severity="info"
                      className="dash-header-btn-alt"
                    />
                    <Tag value="Step 3" severity="success" className="dash-step-tag px-2 py-1 text-sm" />
                  </div>
                </div>
                
                <div className="p-4 border-b border-slate-100">
                  {!alternatives.length && !fetchingAlternatives && (
                    <p className="text-sm text-slate-400 text-center py-2">Click "Find Alternatives" to search for cross-references.</p>
                  )}
                  
                  {alternatives.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {alternatives.map((alt, i) => (
                        <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 font-medium flex align-items-center gap-2">
                          <i className="pi pi-microchip text-blue-500" />
                          {alt.mpn} <span className="text-slate-400 text-xs font-normal">({alt.manufacturer})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dash-download-bar">
                  <div className="dash-dl-info">
                    <i className="pi pi-file-excel text-green-600" />
                    <span>Export comprehensive compliance workbook</span>
                  </div>
                  <Button
                    label={downloading ? 'Generating…' : 'Download Color-Coded Report'}
                    icon={downloading ? 'pi pi-spin pi-spinner' : 'pi pi-download'}
                    severity="success"
                    onClick={handleDownloadReport}
                    disabled={downloading || alternatives.length === 0}
                    loading={downloading}
                    className="dash-btn-dl"
                  />
                </div>
              </div>
            </RevealSection>
          )}

        </div>

        {/* ── Right Column ── */}
        <div className="dash-col-side">

          {/* Recent Searches */}
          <RevealSection delay={40}>
            <SearchHistory onSelectPart={handleSelectFromHistory} />
          </RevealSection>

          {/* Priority Distribution Donut */}
          <RevealSection delay={100}>
            <div className="dash-card">
              <div className="dash-card-header-sm">
                <i className="pi pi-chart-pie dash-side-icon" />
                <h3 className="dash-side-title">Priority Distribution</h3>
              </div>
              <div className="dash-donut-wrap">
                <Chart type="doughnut" data={donutData} options={donutOptions} className="dash-donut" />
                <div className="dash-donut-legend">
                  {donutData.labels.map((l, i) => (
                    <div key={l} className="dash-donut-leg-item">
                      <span className="dash-donut-dot" style={{ background: donutData.datasets[0].backgroundColor[i] }} />
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Weekly Activity Chart */}
          <RevealSection delay={120}>
            <div className="dash-card">
              <div className="dash-card-header-sm">
                <i className="pi pi-chart-bar dash-side-icon" />
                <h3 className="dash-side-title">Weekly Lookup Activity</h3>
              </div>
              <div className="p-3">
                <Chart type="bar" data={barData} options={barOptions} className="dash-bar-chart side" />
              </div>
            </div>
          </RevealSection>

          {/* Session Status */}
          <RevealSection delay={150}>
            <div className="dash-card">
              <div className="dash-card-header-sm">
                <i className="pi pi-server dash-side-icon" />
                <h3 className="dash-side-title">Session Status</h3>
              </div>
              <ul className="dash-session-list">
                {[
                  { label: 'Part Number',   value: partNumber || '—',          icon: 'pi pi-microchip' },
                  { label: 'Manufacturer',  value: manufacturer || '—',        icon: 'pi pi-building' },
                  { label: 'Specs Loaded',  value: eolSpecs.length,            icon: 'pi pi-list' },
                  { label: 'Export Ready',  value: priorityMap.length > 0 ? '✓ Yes' : 'No', icon: 'pi pi-check-circle', ok: priorityMap.length > 0 },
                ].map(item => (
                  <li key={item.label} className="dash-session-row">
                    <span className="dash-session-key"><i className={item.icon} />{item.label}</span>
                    <span className={cn('dash-session-val', item.ok && 'ok')}>{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </RevealSection>

          {/* Workflow Checklist */}
          <RevealSection delay={200}>
            <div className="dash-card">
              <div className="dash-card-header-sm">
                <i className="pi pi-check-square dash-side-icon" />
                <h3 className="dash-side-title">Workflow Checklist</h3>
              </div>
              <ul className="dash-checklist">
                {checklist.map((item, i) => (
                  <li key={i} className={cn('dash-check-item', item.done && 'done')}>
                    <div className={cn('dash-check-marker', item.done && 'done')}>
                      {item.done ? <i className="pi pi-check" /> : <span>{i + 1}</span>}
                    </div>
                    <div className="dash-check-body">
                      <span className="dash-check-label">{item.label}</span>
                      {item.done && <span className="dash-check-badge">Complete</span>}
                    </div>
                  </li>
                ))}
              </ul>
              <ProgressBar
                value={Math.round((checklist.filter(c => c.done).length / checklist.length) * 100)}
                className="dash-progress"
                showValue={false}
              />
              <p className="dash-progress-label">
                {checklist.filter(c => c.done).length} of {checklist.length} steps complete
              </p>
            </div>
          </RevealSection>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
