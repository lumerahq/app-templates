import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, CalendarClock, DollarSign, Users } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatAmount, getAgingBreakdown, getDashboardStats, listCustomers } from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: aging } = useQuery({
    queryKey: ['aging-breakdown'],
    queryFn: getAgingBreakdown,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['top-customers'],
    queryFn: () => listCustomers(1),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Collections overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Outstanding"
          value={formatAmount(Number(stats?.total_outstanding ?? 0))}
          icon={<DollarSign className="size-5" />}
        />
        <StatCard
          title="Active Customers"
          value={Number(stats?.active_customers ?? 0)}
          icon={<Users className="size-5" />}
        />
        <StatCard
          title="Follow-ups Due"
          value={Number(stats?.followups_due ?? 0)}
          icon={<CalendarClock className="size-5" />}
        />
        <StatCard
          title="Escalated"
          value={Number(stats?.escalated ?? 0)}
          icon={<AlertTriangle className="size-5" />}
        />
      </div>

      {/* AR Aging */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-4">AR Aging Summary</h2>
        {aging && aging.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Bucket</th>
                <th className="pb-2 px-4 font-medium text-right">Amount</th>
                <th className="pb-2 pl-4 font-medium text-right">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {aging.map((row) => (
                <tr key={row.bucket} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{row.bucket}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatAmount(Number(row.amount))}</td>
                  <td className="py-2 pl-4 text-right tabular-nums">{Number(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No open invoices.</p>
        )}
      </div>

      {/* Priority Customers */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Priority Customers</h2>
          <Link to="/customers" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {topCustomers?.items && topCustomers.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 px-4 font-medium text-right">Outstanding</th>
                <th className="pb-2 px-4 font-medium">Risk</th>
                <th className="pb-2 pl-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.items.slice(0, 5).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link to="/customers/$id" params={{ id: c.id! }} className="text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatAmount(c.total_outstanding)}</td>
                  <td className="py-2 px-4">
                    {c.risk_level ? <StatusBadge status={c.risk_level} /> : <span className="text-muted-foreground">--</span>}
                  </td>
                  <td className="py-2 pl-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        )}
      </div>
    </div>
  );
}
