import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '../components/StatusBadge';
import { type FixedAsset, createAsset, formatAmount, formatCategory, listAssets } from '../lib/queries';

export const Route = createFileRoute('/assets/')({
  component: AssetsListPage,
});

const statusFilters = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Fully Depreciated', value: 'fully_depreciated' },
  { label: 'Disposed', value: 'disposed' },
] as const;

const categoryFilters = [
  { label: 'All Categories', value: undefined },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Furniture', value: 'furniture' },
  { label: 'Vehicles', value: 'vehicles' },
  { label: 'Software', value: 'software' },
  { label: 'Buildings', value: 'buildings' },
  { label: 'Leasehold', value: 'leasehold_improvements' },
] as const;

function AssetsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['assets', page, statusFilter, categoryFilter],
    queryFn: () => listAssets(page, statusFilter, categoryFilter),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="text-muted-foreground mt-1">Manage your fixed asset register</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Asset
        </button>
      </div>

      {showForm && (
        <NewAssetForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }}
        />
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
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
        <select
          value={categoryFilter ?? ''}
          onChange={(e) => { setCategoryFilter(e.target.value || undefined); setPage(1); }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          {categoryFilters.map((f) => (
            <option key={f.label} value={f.value ?? ''}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium text-right">Cost</th>
              <th className="px-4 py-3 font-medium text-right">NBV</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
              </tr>
            ) : data?.items && data.items.length > 0 ? (
              data.items.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/assets/$id" params={{ id: a.id! }} className="text-primary hover:underline font-medium">
                      {a.name}
                    </Link>
                    {a.asset_tag && <p className="text-xs text-muted-foreground">{a.asset_tag}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCategory(a.category)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.location || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatAmount(a.cost_basis)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatAmount(Number(a.cost_basis) - Number(a.accumulated_depreciation))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No assets found.
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

function NewAssetForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [category, setCategory] = useState<string>('equipment');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [salvageValue, setSalvageValue] = useState('0');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('60');
  const [depMethod, setDepMethod] = useState('straight_line');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createAsset({
        name,
        asset_tag: assetTag,
        category: category as FixedAsset['category'],
        acquisition_date: acquisitionDate,
        cost_basis: Number(costBasis),
        salvage_value: Number(salvageValue),
        useful_life_months: Number(usefulLifeMonths),
        depreciation_method: depMethod as FixedAsset['depreciation_method'],
        location,
        department,
        accumulated_depreciation: 0,
        status: 'active',
      }),
    onSuccess: () => {
      toast.success('Asset created');
      onSaved();
    },
    onError: () => toast.error('Failed to create asset'),
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">New Asset</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. MacBook Pro 16&quot;" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Asset Tag</label>
          <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. FA-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="equipment">Equipment</option>
            <option value="furniture">Furniture</option>
            <option value="vehicles">Vehicles</option>
            <option value="software">Software</option>
            <option value="buildings">Buildings</option>
            <option value="leasehold_improvements">Leasehold Improvements</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Acquisition Date *</label>
          <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Cost Basis *</label>
          <input type="number" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Salvage Value</label>
          <input type="number" value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Useful Life (months) *</label>
          <input type="number" value={usefulLifeMonths} onChange={(e) => setUsefulLifeMonths(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="60" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Depreciation Method</label>
          <select value={depMethod} onChange={(e) => setDepMethod(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="straight_line">Straight Line</option>
            <option value="declining_balance">Declining Balance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. HQ - Floor 2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. Engineering" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || !acquisitionDate || !costBasis || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating...' : 'Create Asset'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
