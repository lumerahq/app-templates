import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@lumerahq/ui/components';
import { pbList, type PbRecord } from '@lumerahq/ui/lib';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Clock, Download, Loader2 } from 'lucide-react';
import type { AuditEntry } from '../lib/queries';

export const Route = createFileRoute('/audit')({
  component: AuditLogPage,
});

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-blue-100 text-blue-700',
  ai_coded: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  posted: 'bg-emerald-100 text-emerald-700',
};

const ACTION_OPTIONS = ['created', 'ai_coded', 'approved', 'rejected', 'posted'];

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const perPage = 25;

  const filter = actionFilter ? JSON.stringify({ action: actionFilter }) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log-page', page, actionFilter],
    queryFn: () =>
      pbList<AuditEntry & PbRecord>('audit_log', {
        page,
        perPage,
        sort: '-created',
        filter,
      }),
    staleTime: 10000,
  });

  const entries = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const handleActionFilter = (action: string | undefined) => {
    setActionFilter(action);
    setPage(1);
  };

  const handleDownload = () => {
    const headers = ['Timestamp', 'Action', 'Entity ID', 'Details', 'Performed By'];
    const rows = entries.map((e) => [
      e.created || '',
      e.action,
      e.entity_id,
      e.details,
      e.performed_by,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit_log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          {totalItems} event{totalItems === 1 ? '' : 's'} — track all invoice actions for compliance
        </p>
      </div>

      {/* Filters + export */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleActionFilter(undefined)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              !actionFilter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            All
          </button>
          {ACTION_OPTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleActionFilter(actionFilter === action ? undefined : action)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                actionFilter === action
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {action.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      {/* Entries */}
      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">No audit log entries</p>
            <p className="text-sm mt-1">Actions will appear here as they happen</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 flex items-start gap-4 hover:bg-muted/30">
                <div className="p-2 rounded-full bg-muted shrink-0">
                  <Clock className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium truncate">{entry.details}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.performed_by}</span>
                    <span className="w-px h-3 bg-border" />
                    <span title={entry.created}>{formatTime(entry.created!)}</span>
                    <span className="w-px h-3 bg-border" />
                    <Link
                      to="/invoices/$invoiceId"
                      params={{ invoiceId: entry.entity_id }}
                      className="text-primary hover:underline font-mono"
                    >
                      {entry.entity_id.slice(0, 10)}...
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="size-4 mr-1" />
                Prev
              </Button>
              <span className="text-sm tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
