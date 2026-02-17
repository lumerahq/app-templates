import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { FileText, Mail, MessageSquare, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { listAuditLog } from '../lib/queries';

export const Route = createFileRoute('/audit-log')({
  component: AuditLogPage,
});

function AuditLogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => listAuditLog(page),
  });

  const entries = data?.items || [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Track all actions across the system</p>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : entries.length > 0 ? (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                <ActionIcon action={entry.action} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground capitalize">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.entity_type}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {entry.created?.split(' ')[0] || ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No audit entries yet. Actions will be logged as you use the app.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  const cls = 'size-4 shrink-0 mt-0.5';
  if (action.includes('email') || action.includes('draft')) return <Mail className={`${cls} text-blue-500`} />;
  if (action.includes('delete')) return <Trash2 className={`${cls} text-red-500`} />;
  if (action.includes('created')) return <Plus className={`${cls} text-green-500`} />;
  if (action.includes('updated')) return <Pencil className={`${cls} text-amber-500`} />;
  if (action.includes('status')) return <UserCog className={`${cls} text-purple-500`} />;
  if (action.includes('note')) return <MessageSquare className={`${cls} text-slate-400`} />;
  return <FileText className={`${cls} text-slate-400`} />;
}
