import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, DollarSign, Mail, Users } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { formatAmount, getAgingBuckets, getDashboardStats, listCustomers } from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: aging } = useQuery({
    queryKey: ['aging-buckets'],
    queryFn: getAgingBuckets,
  });

  const { data: priorityCustomers } = useQuery({
    queryKey: ['priority-customers'],
    queryFn: () => listCustomers(1),
  });

  const totalOutstanding = Number(stats?.total_outstanding ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Collections overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Outstanding"
          value={formatAmount(totalOutstanding)}
          icon={<DollarSign className="size-5" />}
        />
        <StatCard
          title="Customers"
          value={Number(stats?.total_customers ?? 0)}
          icon={<Users className="size-5" />}
        />
        <StatCard
          title="Contacted"
          value={Number(stats?.contacted ?? 0)}
          icon={<Mail className="size-5" />}
        />
        <StatCard
          title="Escalated"
          value={Number(stats?.escalated ?? 0)}
          icon={<AlertTriangle className="size-5" />}
        />
      </div>

      {/* AR Aging Summary */}
      {aging && aging.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">AR Aging</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            {aging.map((bucket) => (
              <div key={bucket.bucket} className="rounded-lg border p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">{bucket.bucket}</p>
                <p className="text-lg font-semibold mt-1">{formatAmount(Number(bucket.total))}</p>
                <p className="text-xs text-muted-foreground">{Number(bucket.count)} invoice{Number(bucket.count) !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Customers */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Priority Customers</h2>
          <Link to="/customers" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {priorityCustomers?.items && priorityCustomers.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 px-4 font-medium">Contact</th>
                <th className="pb-2 px-4 font-medium text-right">Outstanding</th>
                <th className="pb-2 px-4 font-medium">Status</th>
                <th className="pb-2 pl-4 font-medium">Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {priorityCustomers.items.slice(0, 8).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link to="/customers/$id" params={{ id: c.id! }} className="text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">{c.contact_name || '—'}</td>
                  <td className="py-2 px-4 text-right tabular-nums font-medium">
                    {formatAmount(c.total_outstanding)}
                  </td>
                  <td className="py-2 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2 pl-4 text-muted-foreground">
                    {c.last_contact_date?.split('T')[0] || 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No customers yet. Run the seed script to add demo data.</p>
        )}
      </div>
    </div>
  );
}
