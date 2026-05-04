import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [displayDialog, setDisplayDialog] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      const mockReports = [
        {
          id: 1,
          partNumber: 'EE-SX4070',
          date: '2025-11-10',
          status: 'Completed',
          fileName: 'EOL_Alternatives_EE-SX4070_20251110_232712.xlsx'
        },
        {
          id: 2,
          partNumber: 'MCP73831T',
          date: '2025-11-10',
          status: 'Completed',
          fileName: 'EOL_Alternatives_MCP73831T_20251110_232254.xlsx'
        },
        {
          id: 3,
          partNumber: 'C2472A',
          date: '2025-11-09',
          status: 'Completed',
          fileName: 'EOL_Alternatives_C2472A_20251109_143022.xlsx'
        }
      ];
      setReports(mockReports);
      setLoading(false);
    }, 500);
  }, []);

  const handleDownload = (fileName) => {
    alert(`Downloading ${fileName}`);
  };

  const handleView = (report) => {
    setSelectedReport(report);
    setDisplayDialog(true);
  };

  const statusBodyTemplate = (rowData) => {
    return <Tag value={rowData.status.toUpperCase()} severity="success" />;
  };

  const actionsBodyTemplate = (rowData) => {
    return (
      <div className="flex gap-2">
        <Button icon="pi pi-eye" rounded text onClick={() => handleView(rowData)} title="View Details" />
        <Button icon="pi pi-download" rounded text severity="success" onClick={() => handleDownload(rowData.fileName)} title="Download Report" />
      </div>
    );
  };

  const dateBodyTemplate = (rowData) => {
    return new Date(rowData.date).toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 border-b pb-6">
        <h2 className="text-3xl font-bold text-slate-900">Analysis Reports</h2>
        <p className="text-slate-500">View and manage your generated analysis reports</p>
      </div>

      <Card className="shadow-xl border-none">
        <DataTable 
          value={reports} 
          loading={loading} 
          paginator 
          rows={10} 
          responsiveLayout="scroll"
          emptyMessage="No reports found."
          rowHover
          className="p-datatable-sm"
        >
          <Column field="partNumber" header="Part Number" sortable style={{ fontWeight: 'bold' }}></Column>
          <Column field="date" header="Date" body={dateBodyTemplate} sortable></Column>
          <Column field="status" header="Status" body={statusBodyTemplate} sortable></Column>
          <Column header="Actions" body={actionsBodyTemplate} style={{ width: '120px' }}></Column>
        </DataTable>
      </Card>

      <Dialog 
        header="Report Details" 
        visible={displayDialog} 
        onHide={() => setDisplayDialog(false)}
        breakpoints={{'960px': '75vw', '640px': '90vw'}} 
        style={{width: '40vw'}}
        footer={
          <div className="flex justify-end gap-4 px-3 pb-2">
            <Button label="Close" icon="pi pi-times" onClick={() => setDisplayDialog(false)} className="p-button-text p-button-secondary" />
            <Button label="Download Report" icon="pi pi-download" severity="success" onClick={() => handleDownload(selectedReport?.fileName)} className="px-4" />
          </div>
        }
      >
        {selectedReport && (
          <div className="flex flex-col gap-0 p-2">
            {[
              { label: 'PART NUMBER', value: selectedReport.partNumber },
              { label: 'DATE', value: new Date(selectedReport.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
              { label: 'STATUS', value: <Tag value={selectedReport.status} severity="success" className="px-3" /> },
              { label: 'FILE NAME', value: selectedReport.fileName, isFile: true },
            ].map((item, i, arr) => (
              <div key={item.label} className={`grid grid-cols-3 gap-6 py-4 items-center ${i !== arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">{item.label}</span>
                <span className={`col-span-2 font-semibold text-slate-700 ${item.isFile ? "text-sm break-all font-mono text-slate-500" : ""}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default Reports;
