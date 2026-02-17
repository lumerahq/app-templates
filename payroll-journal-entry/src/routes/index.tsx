import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle, Clock, ClipboardList, Upload } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { formatAmount, getDashboardStats, listPayrollRuns } from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recent-payroll-runs'],
    queryFn: () => listPayrollRuns(1),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Payroll journal entry overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Runs" value={Number(stats?.total ?? 0)} icon={<ClipboardList className="size-5" />} />
        <StatCard title="Pending Review" value={Number(stats?.pending_review ?? 0)} icon={<Clock className="size-5" />} />
        <StatCard title="Posted" value={Number(stats?.posted ?? 0)} icon={<CheckCircle className="size-5" />} />
        <StatCard title="Draft" value={Number(stats?.draft ?? 0)} icon={<Upload className="size-5" />} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Payroll Runs</h2>
          <Link to="/payroll-runs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentRuns?.items && recentRuns.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Pay Period</th>
                <th className="pb-2 pr-4 font-medium">Pay Date</th>
                <th className="pb-2 px-4 font-medium text-right">Total Debits</th>
                <th className="pb-2 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.items.slice(0, 5).map((run) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link to="/payroll-runs/$id" params={{ id: run.id! }} className="text-primary hover:underline">
                      {formatPeriod(run.pay_period_start, run.pay_period_end)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{run.pay_date?.split('T')[0] || '—'}</td>
                  <td className="py-2 px-4 text-right tabular-nums">
                    {formatAmount(run.total_debits)}
                  </td>
                  <td className="py-2 px-4">
                    <StatusBadge status={run.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
        )}
      </div>
    </div>
  );
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) return 'Unknown period';
  const s = start?.split('T')[0] || '?';
  const e = end?.split('T')[0] || '?';
  return `${s} to ${e}`;
}
