import React, { useEffect, useState } from 'react';
import { Database, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';
import { api } from '../lib/api';
import { usePreferences } from '../hooks/usePreferences';
import { Badge, Button, Card, CardHead, Field, PageHeader } from '../components/ui';

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 — Must match' },
  { value: 2, label: 'P2 — Can differ' },
  { value: 3, label: 'P3 — Cosmetic' },
];

const SOURCES = [
  ['Octopart', 'octopart', 'Specification source of record'],
  ['Digi-Key', 'digikey', 'Cross-references and live pricing'],
  ['Mouser', 'mouser', 'Availability corroboration'],
  ['Azure OpenAI', 'azure_openai', 'FFF classification of each parameter'],
];

/*
 * Only settings that actually change behaviour live here. Both preferences
 * below are read by the analysis workspace; nothing on this page is a
 * placeholder switch.
 */
export default function Settings() {
  const { preferences, update, reset } = usePreferences();
  const [engine, setEngine] = useState(null);

  useEffect(() => {
    api
      .get('/api/v1/session_status')
      .then((data) => setEngine(data.configured_apis || null))
      .catch(() => setEngine(null));
  }, []);

  return (
    <div className="workspace">
      <PageHeader
        breadcrumb={['Account', 'Settings']}
        title="Settings"
        description="Analysis defaults for this browser, and the state of the credentials the host is running with."
        actions={
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={reset}>
            Reset defaults
          </Button>
        }
      />

      <div className="grid flex-1 grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHead
            icon={SlidersHorizontal}
            title="Analysis defaults"
            description="Applied to every new part analysis. Saved to this browser as you change them."
          />
          <div className="flex flex-col gap-6 p-6">
            <Field
              id="default-priority"
              label="Default priority for new parameters"
              hint="Every specification row starts at this tier until you change it."
            >
              <select
                id="default-priority"
                className="select-violet w-full max-w-sm"
                value={preferences.defaultPriority}
                onChange={(e) => update('defaultPriority', Number(e.target.value))}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-center justify-between gap-6 border-t border-hair-cloud pt-5">
              <div>
                <label htmlFor="auto-download" className="text-body-md text-ink-deep">
                  Export the workbook automatically
                </label>
                <p className="text-caption text-ink-muted">
                  Download as soon as the alternatives search succeeds, without a second click.
                </p>
              </div>
              <InputSwitch
                inputId="auto-download"
                checked={preferences.autoDownload}
                onChange={(e) => update('autoDownload', e.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHead
            icon={Database}
            title="Data sources"
            description="Credentials are held in the host environment and never sent to the browser. Set them as application settings on the server to change this."
          />
          <ul className="flex flex-col p-6">
            {SOURCES.map(([label, key, role]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-6 border-b border-hair-cloud py-3 last:border-b-0"
              >
                <span>
                  <span className="block text-body-md text-ink-deep">{label}</span>
                  <span className="block text-caption text-ink-faint">{role}</span>
                </span>
                <Badge tone={engine?.[key] ? 'violet' : 'outline'}>
                  {engine?.[key] ? 'Connected' : 'Not configured'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
