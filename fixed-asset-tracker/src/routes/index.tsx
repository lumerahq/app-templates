import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Box, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatAmount, formatCategory, getCategoryBreakdown, getDashboardStats, listAssets } from '../lib/queries';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: categories } = useQuery({
    queryKey: ['category-breakdown'],
    queryFn: getCategoryBreakdown,
  });

  const { data: recentAssets } = useQuery({
    queryKey: ['recent-assets'],
    queryFn: () => listAssets(1),
  });

  const totalNbv = Number(stats?.total_nbv ?? 0);
  const totalCost = Number(stats?.total_cost ?? 0);
  const totalAccumulated = Number(stats?.total_accumulated ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Fixed asset overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Book Value"
          value={formatAmount(totalNbv)}
          icon={<DollarSign className="size-5" />}
        />
        <StatCard
          title="Total Assets"
          value={Number(stats?.total_assets ?? 0)}
          subtitle={`${Number(stats?.active_count ?? 0)} active`}
          icon={<Box className="size-5" />}
        />
        <StatCard
          title="Accum. Depreciation"
          value={formatAmount(totalAccumulated)}
          icon={<TrendingDown className="size-5" />}
        />
        <StatCard
          title="Fully Depreciated"
          value={Number(stats?.fully_depreciated_count ?? 0)}
          icon={<AlertTriangle className="size-5" />}
        />
      </div>

      {/* Category Breakdown */}
      {categories && categories.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">By Category</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <div key={cat.category} className="rounded-lg border p-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">{formatCategory(cat.category)}</p>
                <p className="text-lg font-semibold mt-1">{formatAmount(Number(cat.total_nbv))}</p>
                <p className="text-xs text-muted-foreground">{Number(cat.count)} asset{Number(cat.count) !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NBV vs Cost bar */}
      {totalCost > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">Depreciation Progress</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cost: {formatAmount(totalCost)}</span>
              <span className="text-muted-foreground">NBV: {formatAmount(totalNbv)}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((totalNbv / totalCost) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(((totalCost - totalNbv) / totalCost) * 100)}% depreciated
            </p>
          </div>
        </div>
      )}

      {/* Recent Assets */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Assets</h2>
          <Link to="/assets" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentAssets?.items && recentAssets.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Asset</th>
                <th className="pb-2 px-4 font-medium">Category</th>
                <th className="pb-2 px-4 font-medium text-right">Cost</th>
                <th className="pb-2 px-4 font-medium text-right">NBV</th>
                <th className="pb-2 pl-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAssets.items.slice(0, 8).map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link to="/assets/$id" params={{ id: a.id! }} className="text-primary hover:underline font-medium">
                      {a.name}
                    </Link>
                    {a.asset_tag && <p className="text-xs text-muted-foreground">{a.asset_tag}</p>}
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">{formatCategory(a.category)}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatAmount(a.cost_basis)}</td>
                  <td className="py-2 px-4 text-right tabular-nums font-medium">
                    {formatAmount(Number(a.cost_basis) - Number(a.accumulated_depreciation))}
                  </td>
                  <td className="py-2 pl-4">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No assets yet. Run the seed script to add demo data.</p>
        )}
      </div>
    </div>
  );
}
