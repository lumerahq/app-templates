import { type PbRecord, pbList } from '@lumerahq/ui/lib';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/audit')({
  component: AuditLogPage,
});

type AuditAction = 'create' | 'update' | 'delete';
type AuditCategory = 'invoice' | 'vendor' | 'gl_account';

type AuditLogEntry = PbRecord & {
  action: AuditAction;
  action_category: AuditCategory;
  action_label: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  target_collection: string;
  target_record_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
};

type FieldChange = {
  field: string;
  old_value: unknown;
  new_value: unknown;
};

const categoryFilters = [
  { label: 'All', value: 'all' as const },
  { label: 'Invoice', value: 'invoice' as const },
  { label: 'Vendor', value: 'vendor' as const },
  { label: 'GL Account', value: 'gl_account' as const },
];

const PER_PAGE = 20;

function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allData, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () =>
      pbList<AuditLogEntry>('audit_log', {
        perPage: 500,
        sort: '-created',
      }),
    staleTime: 10000,
  });

  const filteredItems =
    categoryFilter === 'all'
      ? allData?.items || []
      : (allData?.items || []).filter((item) => item.action_category === categoryFilter);

  const totalPages = Math.ceil(filteredItems.length / PER_PAGE);
  const entries = filteredItems.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDownload = () => {
    const headers = ['Timestamp', 'Action', 'Category', 'Description', 'Actor', 'Actor Email'];
    const rows = filteredItems.map((entry) => [
      entry.created || '',
      entry.action,
      entry.action_category,
      entry.action_label,
      entry.actor_name || '',
      entry.actor_email || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = categoryFilter === 'all' ? 'audit_log.csv' : `audit_log_${categoryFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Track all changes made in the system</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {categoryFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setCategoryFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                categoryFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={filteredItems.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      {/* Entries */}
      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">No audit log entries</p>
            <p className="text-sm mt-1">Actions will appear here as they happen</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const changes = deriveFieldChanges(entry);

              return (
                <div key={entry.id} className="hover:bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id!)}
                    className="w-full p-4 flex items-center gap-4 text-left"
                  >
                    <div className={`p-2 rounded-lg ${getActionColor(entry.action)}`}>
                      <ActionIcon action={entry.action} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{entry.action_label}</p>
                        <CategoryBadge category={entry.action_category} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.actor_name || entry.actor_email || 'System'} &middot; {formatTime(entry.created!)}
                      </p>
                    </div>
                    {changes.length > 0 && (
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {isExpanded && changes.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="ml-10 p-3 rounded-lg bg-muted/50 space-y-2">
                        {changes.map((change) => (
                          <div key={change.field} className="text-sm">
                            <span className="font-medium text-muted-foreground">
                              {formatFieldName(change.field)}:
                            </span>{' '}
                            {change.old_value !== undefined && change.old_value !== null && (
                              <>
                                <span className="line-through text-red-600/70">
                                  {formatValue(change.old_value)}
                                </span>
                                <span className="text-muted-foreground mx-1">&rarr;</span>
                              </>
                            )}
                            <span className="text-green-600">
                              {formatValue(change.new_value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

function ActionIcon({ action }: { action: AuditAction }) {
  switch (action) {
    case 'create':
      return <Plus className="size-4" />;
    case 'update':
      return <RefreshCw className="size-4" />;
    case 'delete':
      return <Trash2 className="size-4" />;
  }
}

function getActionColor(action: AuditAction): string {
  switch (action) {
    case 'create':
      return 'text-green-600 bg-green-50';
    case 'update':
      return 'text-blue-600 bg-blue-50';
    case 'delete':
      return 'text-red-600 bg-red-50';
  }
}

const categoryBadgeConfig: Record<AuditCategory, { label: string; color: string }> = {
  invoice: { label: 'Invoice', color: 'bg-blue-100 text-blue-700' },
  vendor: { label: 'Vendor', color: 'bg-amber-100 text-amber-700' },
  gl_account: { label: 'GL Account', color: 'bg-slate-100 text-slate-700' },
};

function CategoryBadge({ category }: { category: AuditCategory }) {
  const badge = categoryBadgeConfig[category] ?? { label: category, color: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
      {badge.label}
    </span>
  );
}

function deriveFieldChanges(entry: AuditLogEntry): FieldChange[] {
  const changes: FieldChange[] = [];
  const before = entry.before_state || {};
  const after = entry.after_state || {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old_value: oldVal, new_value: newVal });
    }
  }
  return changes;
}

function formatTime(dateStr: string): string {
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

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
