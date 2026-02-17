import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { NewPayrollRunDialog } from '../components/NewPayrollRunDialog';
import { formatAmount, listPayrollRuns } from '../lib/queries';

export const Route = createFileRoute('/payroll-runs/')({
  component: PayrollRunsListPage,
});

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Review', value: 'review' },
  { label: 'Posted', value: 'posted' },
  { label: 'Rejected', value: 'rejected' },
] as const;

function PayrollRunsListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-runs', page, statusFilter],
    queryFn: () => listPayrollRuns(page, statusFilter),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Runs</h1>
          <p className="text-muted-foreground mt-1">Upload and manage payroll journal entries</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          New Payroll Run
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Pay Period</th>
              <th className="px-4 py-3 font-medium">Pay Date</th>
              <th className="px-4 py-3 font-medium text-right">Total Debits</th>
              <th className="px-4 py-3 font-medium text-right">Total Credits</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((run) => (
                <tr key={run.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/payroll-runs/$id" params={{ id: run.id! }} className="text-primary hover:underline">
                      {formatPeriod(run.pay_period_start, run.pay_period_end)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{run.pay_date?.split('T')[0] || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(run.total_debits)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(run.total_credits)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No payroll runs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <NewPayrollRunDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) return 'Unknown period';
  const s = start?.split('T')[0] || '?';
  const e = end?.split('T')[0] || '?';
  return `${s} to ${e}`;
}
