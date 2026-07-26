import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { ChevronRight, Clock, RefreshCw, Search } from 'lucide-react';
import { api, relativeTime } from '../lib/api';
import { Card, EmptyState } from './ui';

/**
 * Recent lookups for the signed-in user.
 * Exposes `refresh()` via ref so the analysis page can re-pull after a lookup.
 */
const SearchHistory = forwardRef(function SearchHistory({ onSelect, limit = 8 }, ref) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/v1/search-history');
      setHistory(data.history || []);
    } catch (err) {
      setError(err.status === 401 ? 'Session expired — sign in again.' : 'Could not load recent lookups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-hair-cloud p-5">
        <h2 className="flex items-center gap-2 font-display text-heading-sm text-ink-deep">
          <Clock size={18} aria-hidden="true" className="text-violet-mid" />
          Recent lookups
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn btn-ghost btn-icon"
          aria-label="Refresh recent lookups"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      {error ? (
        <p className="px-5 py-6 text-center text-caption text-pink">{error}</p>
      ) : history.length === 0 && !loading ? (
        <EmptyState icon={Search} title="Nothing yet" description="Your recent part lookups will collect here." />
      ) : (
        <ul className="flex flex-col">
          {history.slice(0, limit).map((record) => (
            <li key={record.id} className="border-b border-hair-cloud last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect?.(record.part_number, record.manufacturer)}
                className="group flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-press-light"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body-md text-ink-deep">{record.part_number}</span>
                  {record.manufacturer && (
                    <span className="block truncate text-caption text-ink-faint">{record.manufacturer}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="micro-cap text-ink-faint">{relativeTime(record.searched_at)}</span>
                  <ChevronRight size={14} aria-hidden="true" className="text-hair-cool group-hover:text-ink-deep" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
});

export default SearchHistory;
