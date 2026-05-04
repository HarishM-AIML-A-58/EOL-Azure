import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Loader2, ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';

function SearchHistory({ onSelectPart }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/search-history`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      } else if (response.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load search history');
      }
    } catch (err) {
      console.error('Search history fetch error:', err);
      setError('Network error. Could not load search history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="p-6 border-b flex items-center justify-between">
        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          Recent Searches
        </h3>
        <button
          onClick={fetchSearchHistory}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
          disabled={loading}
          title="Refresh history"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="p-0">
        {error ? (
          <div className="p-4 text-xs text-rose-500 bg-rose-50 text-center">
            {error}
          </div>
        ) : loading && history.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Loading history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Search className="h-8 w-8 opacity-20" />
            <div className="text-sm font-medium">No history yet</div>
            <p className="text-xs">Your recent lookups will appear here.</p>
          </div>
        ) : (
          <div className="divide-y">
            {history.slice(0, 8).map((record) => (
              <button
                key={record.id}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
                onClick={() => onSelectPart(record.part_number, record.manufacturer)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold tracking-tight text-slate-900">
                    {record.part_number}
                  </span>
                  {record.manufacturer && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {record.manufacturer}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                    {formatDate(record.searched_at)}
                  </span>
                  <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchHistory;
