import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Calculator, Pencil, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { createRun, pollRun } from '@lumerahq/ui/lib';
import { StatusBadge } from '../components/StatusBadge';
import {
  type FixedAsset,
  deleteAsset,
  formatAmount,
  formatCategory,
  getAsset,
  listDepreciationEntries,
  updateAsset,
} from '../lib/queries';

export const Route = createFileRoute('/assets/$id')({
  component: AssetDetailPage,
});

function AssetDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [runningDepr, setRunningDepr] = useState(false);

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => getAsset(id),
  });

  const { data: entries } = useQuery({
    queryKey: ['depreciation-entries', id],
    queryFn: () => listDepreciationEntries(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteAsset(id),
    onSuccess: () => {
      toast.success('Asset deleted');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate({ to: '/assets' });
    },
    onError: () => toast.error('Failed to delete asset'),
  });

  const disposeMut = useMutation({
    mutationFn: (proceeds: number) =>
      updateAsset(id, {
        status: 'disposed',
        disposal_date: new Date().toISOString().split('T')[0],
        disposal_proceeds: proceeds,
      }),
    onSuccess: () => {
      toast.success('Asset disposed');
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to dispose asset'),
  });

  async function runDepreciation() {
    if (!asset) return;
    setRunningDepr(true);
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const run = await createRun({
        automationId: 'fixed-asset-tracker:calculate_depreciation',
        inputs: { asset_id: id, period },
      });
      const result = await pollRun(run.id);
      const res = result?.result as Record<string, unknown> | undefined;
      if (res?.status === 'success') {
        toast.success(`Depreciation of ${formatAmount(res.depreciation as number)} recorded`);
      } else {
        toast.info((res?.message as string) || 'Depreciation skipped');
      }
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['depreciation-entries', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch {
      toast.error('Failed to run depreciation');
    } finally {
      setRunningDepr(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!asset) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Asset not found.</p>
        <Link to="/assets" className="text-primary hover:underline text-sm mt-2 inline-block">Back to Assets</Link>
      </div>
    );
  }

  const nbv = Number(asset.cost_basis) - Number(asset.accumulated_depreciation);
  const depreciationPct = Number(asset.cost_basis) > 0
    ? Math.round((Number(asset.accumulated_depreciation) / Number(asset.cost_basis)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/assets" className="rounded-md p-1.5 hover:bg-muted transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{asset.name}</h1>
              <StatusBadge status={asset.status} />
            </div>
            {asset.asset_tag && <p className="text-muted-foreground text-sm">{asset.asset_tag}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {asset.status === 'active' && (
            <button
              type="button"
              onClick={runDepreciation}
              disabled={runningDepr}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Calculator className="size-4" />
              {runningDepr ? 'Running...' : 'Run Depreciation'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {editing ? (
        <AssetEditForm asset={asset} onSaved={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ['asset', id] });
          queryClient.invalidateQueries({ queryKey: ['assets'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }} />
      ) : (
        <>
          {/* Financial Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Cost Basis</p>
              <p className="text-xl font-semibold mt-1">{formatAmount(asset.cost_basis)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Accum. Depreciation</p>
              <p className="text-xl font-semibold mt-1">{formatAmount(asset.accumulated_depreciation)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Net Book Value</p>
              <p className="text-xl font-semibold mt-1">{formatAmount(nbv)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Depreciated</p>
              <p className="text-xl font-semibold mt-1">{depreciationPct}%</p>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${depreciationPct}%` }} />
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Asset Details</h2>
              <dl className="space-y-2 text-sm">
                <DetailRow label="Category" value={formatCategory(asset.category)} />
                <DetailRow label="Acquisition Date" value={asset.acquisition_date?.split('T')[0] || '—'} />
                <DetailRow label="Useful Life" value={`${asset.useful_life_months} months`} />
                <DetailRow label="Depreciation Method" value={asset.depreciation_method === 'straight_line' ? 'Straight Line' : 'Declining Balance'} />
                <DetailRow label="Salvage Value" value={formatAmount(asset.salvage_value)} />
              </dl>
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Location & Department</h2>
              <dl className="space-y-2 text-sm">
                <DetailRow label="Location" value={asset.location || '—'} />
                <DetailRow label="Department" value={asset.department || '—'} />
                {asset.status === 'disposed' && (
                  <>
                    <DetailRow label="Disposal Date" value={asset.disposal_date?.split('T')[0] || '—'} />
                    <DetailRow label="Disposal Proceeds" value={formatAmount(asset.disposal_proceeds)} />
                    <DetailRow
                      label="Gain/Loss on Disposal"
                      value={formatAmount(Number(asset.disposal_proceeds ?? 0) - nbv)}
                    />
                  </>
                )}
              </dl>
              {asset.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Depreciation Schedule */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-4">Depreciation Schedule</h2>
        {entries?.items && entries.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Period</th>
                <th className="pb-2 px-4 font-medium text-right">Depreciation</th>
                <th className="pb-2 px-4 font-medium text-right">Accumulated</th>
                <th className="pb-2 px-4 font-medium text-right">NBV</th>
                <th className="pb-2 pl-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.items.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{e.period}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatAmount(e.depreciation_amount)}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatAmount(e.accumulated_total)}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatAmount(e.net_book_value)}</td>
                  <td className="py-2 pl-4">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No depreciation entries yet. Click "Run Depreciation" to create one.</p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-card p-6 space-y-3">
        <h2 className="font-semibold text-red-600">Danger Zone</h2>
        <div className="flex gap-3">
          {asset.status === 'active' && (
            <DisposeButton onDispose={(proceeds) => disposeMut.mutate(proceeds)} isPending={disposeMut.isPending} />
          )}
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-4" />
              Delete Asset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function DisposeButton({ onDispose, isPending }: { onDispose: (proceeds: number) => void; isPending: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [proceeds, setProceeds] = useState('0');

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        Dispose Asset
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={proceeds}
        onChange={(e) => setProceeds(e.target.value)}
        className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm"
        placeholder="Proceeds"
      />
      <button
        type="button"
        onClick={() => onDispose(Number(proceeds))}
        disabled={isPending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Disposing...' : 'Confirm Dispose'}
      </button>
      <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
        Cancel
      </button>
    </div>
  );
}

function AssetEditForm({ asset, onSaved }: { asset: FixedAsset; onSaved: () => void }) {
  const [name, setName] = useState(asset.name);
  const [assetTag, setAssetTag] = useState(asset.asset_tag ?? '');
  const [category, setCategory] = useState(asset.category);
  const [location, setLocation] = useState(asset.location ?? '');
  const [department, setDepartment] = useState(asset.department ?? '');
  const [salvageValue, setSalvageValue] = useState(String(asset.salvage_value ?? 0));
  const [notes, setNotes] = useState(asset.notes ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      updateAsset(asset.id!, {
        name,
        asset_tag: assetTag,
        category,
        location,
        department,
        salvage_value: Number(salvageValue),
        notes,
      }),
    onSuccess: () => {
      toast.success('Asset updated');
      onSaved();
    },
    onError: () => toast.error('Failed to update asset'),
  });

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="font-semibold">Edit Asset</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Asset Tag</label>
          <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as FixedAsset['category'])} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="equipment">Equipment</option>
            <option value="furniture">Furniture</option>
            <option value="vehicles">Vehicles</option>
            <option value="software">Software</option>
            <option value="buildings">Buildings</option>
            <option value="leasehold_improvements">Leasehold Improvements</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Salvage Value</label>
          <input type="number" value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="size-4" />
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
