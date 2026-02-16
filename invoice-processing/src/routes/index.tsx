import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle, Clock, FileText, Send } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { getDashboardStats, getRecentInvoices } from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const recentQuery = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: () => getRecentInvoices(10),
  });

  const stats = statsQuery.data ?? [];

  const getStatByStatuses = (statuses: string[]) => {
    const matching = stats.filter((s) => statuses.includes(s.status));
    return {
      count: matching.reduce((sum, s) => sum + s.count, 0),
      total: matching.reduce((sum, s) => sum + s.total, 0),
    };
  };

  const allInvoices = getStatByStatuses([
    'received', 'processing', 'coded', 'pending_approval', 'approved', 'rejected', 'posted',
  ]);
  const pendingApproval = getStatByStatuses(['pending_approval']);
  const approved = getStatByStatuses(['approved']);
  const posted = getStatByStatuses(['posted']);

  const recentInvoices = recentQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Invoice processing overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={allInvoices.count}
          subtitle={formatCurrency(allInvoices.total)}
          icon={<FileText className="size-5" />}
        />
        <StatCard
          title="Pending Approval"
          value={pendingApproval.count}
          subtitle={formatCurrency(pendingApproval.total)}
          icon={<Clock className="size-5" />}
        />
        <StatCard
          title="Approved"
          value={approved.count}
          subtitle={formatCurrency(approved.total)}
          icon={<CheckCircle className="size-5" />}
        />
        <StatCard
          title="Posted"
          value={posted.count}
          subtitle={formatCurrency(posted.total)}
          icon={<Send className="size-5" />}
        />
      </div>

      {/* Recent invoices */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link to="/invoices" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t text-left text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Invoice #</th>
                <th className="px-5 py-2.5 font-medium">Vendor</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">GL Code</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
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
                  <td className="px-5 py-2.5 font-medium">{formatCurrency(inv.amount)}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{inv.gl_code || '—'}</td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    No invoices yet. Run <code className="bg-muted px-1 rounded">lumera run scripts/seed-demo.py</code> to add sample data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
