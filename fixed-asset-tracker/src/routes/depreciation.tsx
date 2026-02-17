import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Calculator, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { createRun, pollRun } from '@lumerahq/ui/lib';
import { StatusBadge } from '../components/StatusBadge';
import { formatAmount, listAllDepreciationEntries, updateDepreciationEntry } from '../lib/queries';

export const Route = createFileRoute('/depreciation')({
  component: DepreciationPage,
});

function DepreciationPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [runningAll, setRunningAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['all-depreciation', page, statusFilter],
    queryFn: () => listAllDepreciationEntries(page, statusFilter),
  });

  const postMut = useMutation({
    mutationFn: (id: string) => updateDepreciationEntry(id, { status: 'posted' }),
    onSuccess: () => {
      toast.success('Entry posted');
      queryClient.invalidateQueries({ queryKey: ['all-depreciation'] });
    },
    onError: () => toast.error('Failed to post entry'),
  });

  async function runAllDepreciation() {
    setRunningAll(true);
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const run = await createRun({
        automationId: 'fixed-asset-tracker:calculate_depreciation',
        inputs: { period },
      });
      const result = await pollRun(run.id);
      const res = result?.result as Record<string, unknown> | undefined;

      if (res?.status === 'success') {
        toast.success(`Depreciation complete: ${res.succeeded} recorded, ${res.skipped} skipped`);
      } else {
        toast.info((res?.message as string) || 'Depreciation skipped');
      }

      queryClient.invalidateQueries({ queryKey: ['all-depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch {
      toast.error('Failed to run depreciation');
    } finally {
      setRunningAll(false);
    }
  }

  const statusFilters = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Posted', value: 'posted' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Depreciation</h1>
          <p className="text-muted-foreground mt-1">Monthly depreciation entries</p>
        </div>
        <button
          type="button"
          onClick={runAllDepreciation}
          disabled={runningAll}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Calculator className="size-4" />
          {runningAll ? 'Running...' : 'Run All Depreciation'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
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

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium text-right">Depreciation</th>
              <th className="px-4 py-3 font-medium text-right">Accumulated</th>
              <th className="px-4 py-3 font-medium text-right">NBV</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-24" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
              </tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((e) => {
                const asset = (e as Record<string, unknown>).expand as Record<string, Record<string, string>> | undefined;
                const assetName = asset?.fixed_asset?.name;
                const assetTag = asset?.fixed_asset?.asset_tag;
                return (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{e.period}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{assetName || '—'}</div>
                    {assetTag && <div className="text-xs">{assetTag}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(e.depreciation_amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(e.accumulated_total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(e.net_book_value)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3">
                    {e.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => postMut.mutate(e.id!)}
                        disabled={postMut.isPending}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle className="size-3.5" />
                        Post
                      </button>
                    )}
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No depreciation entries yet. Click "Run All Depreciation" to calculate for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
    </div>
  );
}
