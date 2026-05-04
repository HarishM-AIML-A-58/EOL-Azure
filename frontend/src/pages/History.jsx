import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setTimeout(() => {
      setHistory([
        { id: 1, partNumber: 'EE-SX4070',  action: 'Analysis Completed', timestamp: '2025-11-10 23:27:12', status: 'success', details: 'Generated Excel report with 3 recommendations' },
        { id: 2, partNumber: 'MCP73831T',   action: 'Analysis Completed', timestamp: '2025-11-10 23:22:54', status: 'success', details: 'Generated Excel report with 4 recommendations' },
        { id: 3, partNumber: 'C2472A',      action: 'Lookup Failed',      timestamp: '2025-11-09 14:30:22', status: 'error',   details: 'Part number not found in database' },
        { id: 4, partNumber: 'LM358',       action: 'Analysis Started',   timestamp: '2025-11-08 10:15:33', status: 'pending', details: 'Analysis in progress...' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filterOptions = [
    { label: 'All',     value: 'all'     },
    { label: 'Success', value: 'success' },
    { label: 'Errors',  value: 'error'   },
    { label: 'Pending', value: 'pending' },
  ];

  const filteredHistory = filter === 'all'
    ? history
    : history.filter(item => item.status === filter);

  const statusBodyTemplate = (rowData) => {
    const severities = { success: 'success', error: 'danger', pending: 'warning' };
    return <Tag value={rowData.status.toUpperCase()} severity={severities[rowData.status]} />;
  };

  const timestampBodyTemplate = (rowData) =>
    new Date(rowData.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 border-b pb-6">
        <h2 className="text-3xl font-bold text-slate-900">Analysis History</h2>
        <p className="text-slate-500">View your analysis activity and history</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Filter row — plain buttons, no SelectButton to avoid PrimeVue AI badge */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm flex-wrap gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter by Status</span>
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map(opt => (
              <Button
                key={opt.value}
                label={opt.label}
                size="small"
                severity={filter === opt.value ? undefined : 'secondary'}
                outlined={filter !== opt.value}
                onClick={() => setFilter(opt.value)}
                className="text-xs"
              />
            ))}
          </div>
        </div>

        <Card className="shadow-sm border">
          <DataTable
            value={filteredHistory}
            loading={loading}
            paginator
            rows={10}
            responsiveLayout="scroll"
            emptyMessage="No history found."
            rowHover
            size="small"
            className="p-datatable-sm"
          >
            <Column field="partNumber" header="Part Number" sortable style={{ fontWeight: 600 }} />
            <Column field="timestamp"  header="Timestamp"   body={timestampBodyTemplate} sortable />
            <Column field="action"     header="Action"      sortable />
            <Column field="status"     header="Status"      body={statusBodyTemplate} sortable />
            <Column field="details"    header="Details" />
          </DataTable>
        </Card>
      </div>
    </div>
  );
}

export default History;
