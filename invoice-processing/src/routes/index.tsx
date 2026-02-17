import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle, Clock, FileText, Upload } from 'lucide-react';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { StatCard } from '../components/StatCard';
import { formatAmount, getDashboardStats, listInvoices } from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invoices" value={Number(stats?.total ?? 0)} icon={<FileText className="size-5" />} />
        <StatCard title="Pending Review" value={Number(stats?.pending_review ?? 0)} icon={<Clock className="size-5" />} />
        <StatCard title="Approved" value={Number(stats?.approved ?? 0)} icon={<CheckCircle className="size-5" />} />
        <StatCard title="Draft" value={Number(stats?.draft ?? 0)} icon={<Upload className="size-5" />} />
      </div>

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
