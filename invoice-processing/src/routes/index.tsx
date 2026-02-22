import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle, Clock, DollarSign, FileText } from 'lucide-react';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { StatCard } from '../components/StatCard';
import {
  type AgingBucket,
  type SpendRow,
  type StatusPipelineRow,
  formatAmount,
  getDashboardStats,
  getInvoiceAging,
  getSpendByGlCode,
  getSpendByVendor,
  getStatusPipeline,
  listInvoices,
} from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: pipeline } = useQuery({
    queryKey: ['status-pipeline'],
    queryFn: getStatusPipeline,
  });

  const { data: vendorSpend } = useQuery({
    queryKey: ['spend-by-vendor'],
    queryFn: getSpendByVendor,
  });

  const { data: glSpend } = useQuery({
    queryKey: ['spend-by-gl'],
    queryFn: getSpendByGlCode,
  });

  const { data: aging } = useQuery({
    queryKey: ['invoice-aging'],
    queryFn: getInvoiceAging,
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: () => listInvoices(1),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Invoice processing overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invoices" value={Number(stats?.total ?? 0)} icon={<FileText className="size-5" />} />
        <StatCard title="Pending Review" value={Number(stats?.pending_review ?? 0)} icon={<Clock className="size-5" />} />
        <StatCard title="Approved" value={Number(stats?.approved ?? 0)} icon={<CheckCircle className="size-5" />} />
        <StatCard
          title="Approved Amount"
          value={formatAmount(Number(stats?.total_approved_amount ?? 0))}
          icon={<DollarSign className="size-5" />}
        />
      </div>

      {/* Charts Row 1: Pipeline + Vendor Spend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineChart data={pipeline ?? []} />
        <HorizontalBarChart title="Top Vendors by Spend" data={vendorSpend ?? []} color="bg-primary" />
      </div>

      {/* Charts Row 2: GL Spend + Aging */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HorizontalBarChart title="Spend by GL Category" data={glSpend ?? []} color="bg-violet-500" />
        <AgingChart data={aging ?? []} />
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link to="/invoices" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentInvoices?.items && recentInvoices.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Vendor</th>
                <th className="pb-2 pr-4 font-medium">Invoice #</th>
                <th className="pb-2 px-4 font-medium text-right">Amount</th>
                <th className="pb-2 px-4 font-medium">Status</th>
                <th className="pb-2 pl-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.items.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link to="/invoices/$id" params={{ id: inv.id! }} className="text-primary hover:underline">
                      {inv.vendor_name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{inv.invoice_number || '—'}</td>
                  <td className="py-2 px-4 text-right tabular-nums">
                    {formatAmount(inv.total_amount, inv.currency)}
                  </td>
                  <td className="py-2 px-4">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="py-2 pl-4 text-muted-foreground">{inv.invoice_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        )}
      </div>
    </div>
  );
}

// --- Chart Components ---

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-400',
  processing: 'bg-blue-500',
  review: 'bg-amber-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  processing: 'Processing',
  review: 'Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function PipelineChart({ data }: { data: StatusPipelineRow[] }) {
  const maxCount = Math.max(...data.map((d) => Number(d.count)), 1);

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Invoice Pipeline</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const pct = (Number(row.count) / maxCount) * 100;
            return (
              <div key={row.status} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-right text-muted-foreground">
                  {STATUS_LABELS[row.status] || row.status}
                </span>
                <div className="flex-1 h-7 bg-muted/50 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${STATUS_COLORS[row.status] || 'bg-slate-400'} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-medium">{Number(row.count)}</span>
                <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">
                  {formatAmount(Number(row.amount))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HorizontalBarChart({ title, data, color }: { title: string; data: SpendRow[]; color: string }) {
  const maxTotal = Math.max(...data.map((d) => Number(d.total)), 1);

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const pct = (Number(row.total) / maxTotal) * 100;
            return (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-right truncate text-muted-foreground" title={row.label}>
                  {row.label}
                </span>
                <div className="flex-1 h-7 bg-muted/50 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${color} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums font-medium">
                  {formatAmount(Number(row.total))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const AGING_COLORS = ['bg-blue-500', 'bg-amber-400', 'bg-orange-500', 'bg-red-400', 'bg-red-600', 'bg-slate-400'];

function AgingChart({ data }: { data: AgingBucket[] }) {
  const maxAmount = Math.max(...data.map((d) => Number(d.amount)), 1);

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Invoice Aging</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open invoices</p>
      ) : (
        <div className="space-y-3">
          {data.map((row, i) => {
            const pct = (Number(row.amount) / maxAmount) * 100;
            return (
              <div key={row.bucket} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-right text-muted-foreground">{row.bucket}</span>
                <div className="flex-1 h-7 bg-muted/50 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${AGING_COLORS[i] || 'bg-slate-400'} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums font-medium">
                  {formatAmount(Number(row.amount))}
                </span>
                <span className="w-12 shrink-0 text-right text-muted-foreground">
                  {Number(row.count)} inv
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
