import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { NewInvoiceDialog } from '../components/NewInvoiceDialog';
import { formatAmount, listInvoices } from '../lib/queries';

export const Route = createFileRoute('/invoices/')({
  component: InvoicesListPage,
});

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Processing', value: 'processing' },
  { label: 'Review', value: 'review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
] as const;

const sortOptions = [
  { label: 'Newest', value: '-created' },
  { label: 'Oldest', value: 'created' },
  { label: 'Amount (High → Low)', value: '-total_amount' },
  { label: 'Amount (Low → High)', value: 'total_amount' },
  { label: 'Vendor (A → Z)', value: 'vendor_name' },
] as const;

function InvoicesListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState('-created');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // When searching, fetch a larger set and filter client-side
  const perPage = search ? 200 : 20;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search ? 1 : page, statusFilter, sort, search ? 'search' : 'page'],
    queryFn: () => listInvoices(search ? 1 : page, statusFilter, sort, perPage),
  });

  // Client-side search filter
  const searchLower = search.toLowerCase();
  const filteredItems = search && data?.items
    ? data.items.filter(
        (inv) =>
          (inv.vendor_name || '').toLowerCase().includes(searchLower) ||
          (inv.invoice_number || '').toLowerCase().includes(searchLower)
      )
    : data?.items;

  // Client-side pagination when searching
  const PAGE_SIZE = 20;
  const displayItems = search
    ? filteredItems?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filteredItems;
  const totalPages = search
    ? Math.ceil((filteredItems?.length ?? 0) / PAGE_SIZE)
    : data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage uploaded invoices</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          New Invoice
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vendor or invoice #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">GL Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : displayItems && displayItems.length > 0 ? (
              displayItems.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/invoices/$id" params={{ id: inv.id! }} className="text-primary hover:underline">
                      {inv.vendor_name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.invoice_number || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatAmount(inv.total_amount, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {inv.gl_code || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.invoice_date || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
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
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <NewInvoiceDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
