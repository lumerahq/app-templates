import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, listAuditLog } from '../lib/queries';

export const Route = createFileRoute('/audit-log')({
  component: AuditLogPage,
});

function AuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => listAuditLog(page),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Track all changes to customers and invoices</p>
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Actor</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(log.created)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.action} />
                  </td>
                  <td className="px-4 py-3">{log.action_label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.actor_name || log.actor_email || 'System'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No audit log entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data.totalPages ?? 1)}
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
