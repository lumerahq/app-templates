import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@lumerahq/ui/components';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { listInvoices } from '../lib/queries';

export const Route = createFileRoute('/invoices/')({
  component: InvoicesPage,
});

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  coded: 'bg-indigo-100 text-indigo-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  posted: 'bg-emerald-100 text-emerald-800',
};

const STATUS_OPTIONS = [
  'received',
  'processing',
  'coded',
  'pending_approval',
  'approved',
  'rejected',
  'posted',
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices-list', page, statusFilter],
    queryFn: () => listInvoices({ page, perPage, status: statusFilter }),
  });

  const items = data?.items ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  const handleStatusFilter = (status: string | undefined) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} invoice{totalCount === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="size-4" /> Upload Invoice
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleStatusFilter(undefined)}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            !statusFilter
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          All
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => handleStatusFilter(statusFilter === status ? undefined : status)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Invoice #</th>
                <th className="px-5 py-2.5 font-medium">Vendor</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">GL Code</th>
                <th className="px-5 py-2.5 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-t">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="h-4 rounded bg-muted/50 animate-pulse" />
                    </td>
                  </tr>
                ))}
              {!isLoading &&
                items.map((inv) => (
                  <tr key={inv.id} className="border-t hover:bg-muted/50">
                    <td className="px-5 py-2.5">
                      <Link
                        to="/invoices/$invoiceId"
                        params={{ invoiceId: inv.id! }}
                        className="text-primary hover:underline font-medium"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{inv.vendor_name || '—'}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{inv.date || '—'}</td>
                    <td className="px-5 py-2.5 font-medium">{formatCurrency(inv.amount)}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {inv.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{inv.gl_code || '—'}</td>
                    <td className="px-5 py-2.5">
                      {inv.coding_confidence ? `${inv.coding_confidence}%` : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * perPage + 1).toLocaleString()} to{' '}
              {Math.min(page * perPage, totalCount).toLocaleString()} of {totalCount.toLocaleString()}
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
